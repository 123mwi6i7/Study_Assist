/* global Deno */
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { DeadlineValidationError, localDeadlineToUtc } from "../../../lib/assignments/deadlines.ts";

const BUCKET_NAME = "assignment-files";
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 5;
const MAX_REQUEST_BYTES = 55 * 1024 * 1024;

const SUBJECTS = new Set([
  "mathematics_statistics",
  "computer_science_programming",
  "business_management",
  "accounting_finance",
  "economics",
  "research_methodology",
  "academic_writing_guidance",
  "referencing_citation_support",
  "proofreading_draft_feedback",
  "presentation_report_feedback",
  "other_subjects",
]);

const ASSISTANCE_TYPES = new Set([
  "explain_instructions",
  "one_to_one_tutoring",
  "explain_concepts_calculations",
  "programming_guidance",
  "research_guidance",
  "review_student_draft",
  "proofreading_referencing",
  "feedback_structure_arguments",
  "other_permitted_support",
]);

const ACADEMIC_LEVELS = new Set([
  "secondary",
  "certificate",
  "diploma",
  "undergraduate",
  "postgraduate",
  "doctoral",
  "other",
]);

const CURRENCIES = new Set([
  "KES", "USD", "EUR", "GBP", "NGN", "ZAR", "UGX", "TZS", "GHS",
  "INR", "CAD", "AUD", "SGD", "AED", "SAR", "KWD", "JPY",
]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

class SubmissionError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type CheckedFile = {
  bytes: Uint8Array;
  contentType: string;
  extension: string;
  originalFilename: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function readText(form: FormData, name: string, maxLength: number, required = false) {
  const value = form.get(name);
  if (typeof value !== "string") {
    if (required) throw new SubmissionError("Complete all required assignment fields.");
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    if (required) throw new SubmissionError("Complete all required assignment fields.");
    return null;
  }
  if (trimmed.length > maxLength) {
    throw new SubmissionError(`The ${name.replaceAll("_", " ")} field is too long.`);
  }
  return trimmed;
}

function parseBudget(value: string | null, currencyValue: string | null) {
  if (!value) return { amountMinor: null, currency: null };
  const currency = currencyValue?.toUpperCase() ?? "";
  if (!CURRENCIES.has(currency)) {
    throw new SubmissionError("Choose a supported currency for the budget.");
  }

  const fractionDigits = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits;
  const amountPattern = fractionDigits === 0
    ? /^(0|[1-9]\d{0,11})$/
    : new RegExp(`^(0|[1-9]\\d{0,11})(?:\\.(\\d{1,${fractionDigits}}))?$`);
  const match = amountPattern.exec(value);
  if (!match) {
    throw new SubmissionError(
      `Enter a valid ${currency} budget using no more than ${fractionDigits} decimal places.`,
    );
  }

  const whole = BigInt(match[1]);
  const fraction = (match[2] ?? "").padEnd(fractionDigits, "0");
  const amountMinor = whole * 10n ** BigInt(fractionDigits) + BigInt(fraction || "0");
  if (amountMinor > 999_999_999_999_999n) {
    throw new SubmissionError("The budget amount is too large.");
  }

  return { amountMinor: amountMinor.toString(), currency };
}

function hasBytes(bytes: Uint8Array, signature: number[], offset = 0) {
  return signature.every((value, index) => bytes[offset + index] === value);
}

function zipContainsOfficeFile(bytes: Uint8Array, requiredEntry: string) {
  if (!hasBytes(bytes, [0x50, 0x4b, 0x03, 0x04]) || bytes.length < 22) return false;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const earliestEndRecord = Math.max(0, bytes.length - 65_557);
  let endRecord = -1;

  for (let offset = bytes.length - 22; offset >= earliestEndRecord; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      endRecord = offset;
      break;
    }
  }
  if (endRecord < 0) return false;

  const entryCount = view.getUint16(endRecord + 10, true);
  let cursor = view.getUint32(endRecord + 16, true);
  if (entryCount === 0xffff || cursor === 0xffffffff || cursor >= bytes.length) return false;

  let hasContentTypes = false;
  let hasRequiredEntry = false;
  const decoder = new TextDecoder();

  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== 0x02014b50) return false;
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const nameStart = cursor + 46;
    const nameEnd = nameStart + nameLength;
    if (nameEnd > bytes.length) return false;

    const name = decoder.decode(bytes.subarray(nameStart, nameEnd));
    hasContentTypes ||= name === "[Content_Types].xml";
    hasRequiredEntry ||= name === requiredEntry;
    cursor = nameEnd + extraLength + commentLength;
  }

  return hasContentTypes && hasRequiredEntry;
}

function safeFilename(name: string) {
  const leaf = name.replaceAll("\\", "/").split("/").pop() ?? "";
  const cleaned = leaf.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 180);
  if (!cleaned || cleaned === "." || cleaned === "..") {
    throw new SubmissionError("One of the selected files has an invalid filename.");
  }
  return cleaned;
}

function inspectFile(name: string, bytes: Uint8Array): Omit<CheckedFile, "bytes"> {
  const extension = name.toLowerCase().slice(name.lastIndexOf("."));
  if (bytes.length === 0) throw new SubmissionError("Empty files cannot be uploaded.");

  if (extension === ".pdf") {
    const pdfHeader = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 1024)));
    if (!pdfHeader.includes("%PDF-")) throw new SubmissionError("A selected PDF file has invalid contents.");
    return { contentType: "application/pdf", extension, originalFilename: name };
  }

  if (extension === ".png") {
    if (!hasBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
      throw new SubmissionError("A selected PNG file has invalid contents.");
    }
    return { contentType: "image/png", extension, originalFilename: name };
  }

  if (extension === ".jpg" || extension === ".jpeg") {
    if (!hasBytes(bytes, [0xff, 0xd8, 0xff])) {
      throw new SubmissionError("A selected JPEG file has invalid contents.");
    }
    return { contentType: "image/jpeg", extension, originalFilename: name };
  }

  if (extension === ".docx" || extension === ".pptx") {
    const requiredEntry = extension === ".docx" ? "word/document.xml" : "ppt/presentation.xml";
    if (!zipContainsOfficeFile(bytes, requiredEntry)) {
      throw new SubmissionError(`A selected ${extension.slice(1).toUpperCase()} file has invalid contents.`);
    }
    return {
      contentType: extension === ".docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      extension,
      originalFilename: name,
    };
  }

  if (extension === ".txt") {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new SubmissionError("A selected text file must use UTF-8 encoding.");
    }
    if (!text.trim() || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) {
      throw new SubmissionError("A selected text file contains unsupported binary characters.");
    }
    return { contentType: "text/plain", extension, originalFilename: name };
  }

  throw new SubmissionError("Use PDF, DOCX, PPTX, TXT, JPG, or PNG files.");
}

function getDefaultKey(keyName: "SUPABASE_PUBLISHABLE_KEYS" | "SUPABASE_SECRET_KEYS", fallbackName: string) {
  const keySet = Deno.env.get(keyName);
  if (keySet) {
    const keys = JSON.parse(keySet) as Record<string, string>;
    if (keys.default) return keys.default;
  }
  return Deno.env.get(fallbackName) ?? "";
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Use POST to submit an assignment." }, 405);

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_REQUEST_BYTES) {
    return jsonResponse({ error: "The upload is too large. Use up to five files, each no larger than 10 MB." }, 413);
  }

  const authorization = request.headers.get("Authorization") ?? "";
  const bearer = /^Bearer\s+(.+)$/i.exec(authorization)?.[1];
  if (!bearer) return jsonResponse({ error: "Sign in with a student account to submit an assignment." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKey = getDefaultKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  const secretKey = getDefaultKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !publishableKey || !secretKey) {
    console.error("Assignment upload is missing a required Supabase function setting.");
    return jsonResponse({ error: "Assignment uploads are temporarily unavailable." }, 503);
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${bearer}` } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(bearer);
  if (userError || !userData.user) {
    return jsonResponse({ error: "Your sign-in session has expired. Sign in again and retry." }, 401);
  }

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profileError) return jsonResponse({ error: "We could not verify your student account." }, 403);
  if (profile?.role !== "student") {
    return jsonResponse({ error: "Only student accounts can submit assignments." }, 403);
  }

  if (!request.headers.get("content-type")?.toLowerCase().includes("multipart/form-data")) {
    return jsonResponse({ error: "Send the assignment form with its selected files." }, 415);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse({ error: "The upload could not be read. Please select the files again." }, 400);
  }

  let title: string;
  let subject: string;
  let description: string;
  let assistanceType: string;
  let deadlineAt: string;
  let deadlineTimezone: string;
  let courseName: string | null;
  let academicLevel: string | null;
  let institutionName: string | null;
  let preferredLanguage: string | null;
  let additionalNotes: string | null;
  let budget: { amountMinor: string | null; currency: string | null };
  let checkedFiles: CheckedFile[];

  try {
    title = readText(form, "title", 140, true)!;
    subject = readText(form, "subject", 60, true)!;
    description = readText(form, "description", 4000, true)!;
    assistanceType = readText(form, "assistance_type", 60, true)!;
    deadlineTimezone = readText(form, "deadline_timezone", 100, true)!;
    courseName = readText(form, "course_name", 120);
    academicLevel = readText(form, "academic_level", 40);
    institutionName = readText(form, "institution_name", 160);
    preferredLanguage = readText(form, "preferred_language", 80);
    additionalNotes = readText(form, "additional_notes", 2000);

    if (title.length < 3) throw new SubmissionError("The assignment title must be at least 3 characters.");
    if (description.length < 20) throw new SubmissionError("Describe the assignment in at least 20 characters.");
    if (!SUBJECTS.has(subject)) throw new SubmissionError("Choose a subject from the list.");
    if (!ASSISTANCE_TYPES.has(assistanceType)) throw new SubmissionError("Choose a permitted type of academic support.");
    if (academicLevel && !ACADEMIC_LEVELS.has(academicLevel)) {
      throw new SubmissionError("Choose an academic level from the list.");
    }

    const localDeadline = readText(form, "deadline_local", 20, true)!;
    deadlineAt = localDeadlineToUtc(localDeadline, deadlineTimezone);
    budget = parseBudget(readText(form, "budget_amount", 32), readText(form, "budget_currency", 3));

    const submittedEntries = form.getAll("files");
    if (submittedEntries.some((entry) => !(entry instanceof File))) {
      throw new SubmissionError("One of the selected uploads is invalid.");
    }
    const files = submittedEntries.filter((entry): entry is File => entry instanceof File);
    if (files.length < 1) throw new SubmissionError("Attach at least one assignment instruction or supporting document.");
    if (files.length > MAX_FILES) throw new SubmissionError(`Select no more than ${MAX_FILES} files.`);

    checkedFiles = [];
    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        throw new SubmissionError(`Each file must be no larger than 10 MB.`);
      }
      const filename = safeFilename(file.name);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const checked = inspectFile(filename, bytes);
      checkedFiles.push({ ...checked, bytes });
    }
  } catch (error) {
    if (error instanceof DeadlineValidationError) {
      return jsonResponse({ error: error.message }, 400);
    }
    if (error instanceof SubmissionError) return jsonResponse({ error: error.message }, error.status);
    return jsonResponse({ error: "Check the assignment details and selected files, then try again." }, 400);
  }

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  let assignmentId: string | null = null;
  const uploadedPaths: string[] = [];

  try {
    const { data: assignment, error: assignmentError } = await adminClient
      .from("assignments")
      .insert({
        student_id: userData.user.id,
        title,
        subject,
        course_name: courseName,
        description,
        academic_level: academicLevel,
        institution_name: institutionName,
        assistance_type: assistanceType,
        preferred_language: preferredLanguage,
        deadline_at: deadlineAt,
        deadline_timezone: deadlineTimezone,
        budget_amount_minor: budget.amountMinor,
        budget_currency: budget.currency,
        additional_notes: additionalNotes,
        status: "draft",
      })
      .select("id")
      .single();

    if (assignmentError || !assignment) throw new Error("assignment_insert_failed");
    assignmentId = assignment.id;

    const fileRows = [];
    for (const file of checkedFiles) {
      const path = `${userData.user.id}/${assignmentId}/${crypto.randomUUID()}${file.extension}`;
      const { error: uploadError } = await adminClient.storage
        .from(BUCKET_NAME)
        .upload(path, file.bytes, {
          contentType: file.contentType,
          cacheControl: "0",
          upsert: false,
        });

      if (uploadError) throw new Error("storage_upload_failed");
      uploadedPaths.push(path);
      fileRows.push({
        assignment_id: assignmentId,
        uploaded_by: userData.user.id,
        storage_path: path,
        original_filename: file.originalFilename,
        file_size_bytes: file.bytes.byteLength,
        content_type: file.contentType,
      });
    }

    const { error: fileRowsError } = await adminClient.from("assignment_files").insert(fileRows);
    if (fileRowsError) throw new Error("file_metadata_insert_failed");

    const { data: submitted, error: submitError } = await adminClient
      .from("assignments")
      .update({ status: "submitted" })
      .eq("id", assignmentId)
      .eq("student_id", userData.user.id)
      .eq("status", "draft")
      .select("id")
      .single();

    if (submitError || !submitted) throw new Error("assignment_submit_failed");
    return jsonResponse({ assignmentId }, 201);
  } catch (error) {
    if (uploadedPaths.length > 0) {
      const { error: cleanupError } = await adminClient.storage.from(BUCKET_NAME).remove(uploadedPaths);
      if (cleanupError) console.error("Assignment file cleanup failed.", cleanupError.message);
    }
    if (assignmentId) {
      const { error: cleanupError } = await adminClient
        .from("assignments")
        .delete()
        .eq("id", assignmentId)
        .eq("student_id", userData.user.id);
      if (cleanupError) console.error("Assignment record cleanup failed.", cleanupError.message);
    }

    console.error("Assignment submission failed.", error instanceof Error ? error.message : "unknown_error");
    return jsonResponse({ error: "We could not submit the assignment. Please try again." }, 500);
  }
});
