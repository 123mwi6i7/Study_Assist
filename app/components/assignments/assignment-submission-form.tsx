"use client";

import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import Link from "next/link";
import {
  ACCEPTED_ASSIGNMENT_EXTENSIONS,
  ACCEPTED_ASSIGNMENT_FILE_TYPES,
  ACADEMIC_LEVELS,
  ASSIGNMENT_CURRENCIES,
  ASSIGNMENT_SUBJECTS,
  ASSISTANCE_TYPES,
  COMMON_TIME_ZONES,
  MAX_ASSIGNMENT_FILE_BYTES,
  MAX_ASSIGNMENT_FILES,
} from "@/lib/assignments/options";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { getSupabaseConfig } from "@/lib/supabase/config";

type SubmitResponse = {
  assignmentId?: string;
  error?: string;
};

function fileExtension(name: string) {
  return name.toLowerCase().slice(name.lastIndexOf("."));
}

export function AssignmentSubmissionForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const submittingRef = useRef(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successId, setSuccessId] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    const messages: string[] = [];
    const nextFiles = [...selectedFiles];

    for (const file of incoming) {
      if (!ACCEPTED_ASSIGNMENT_EXTENSIONS.includes(fileExtension(file.name) as (typeof ACCEPTED_ASSIGNMENT_EXTENSIONS)[number])) {
        messages.push(`${file.name}: choose a PDF, DOCX, PPTX, TXT, JPG, or PNG file.`);
        continue;
      }
      if (file.size > MAX_ASSIGNMENT_FILE_BYTES) {
        messages.push(`${file.name}: each file must be no larger than 10 MB.`);
        continue;
      }
      if (nextFiles.length >= MAX_ASSIGNMENT_FILES) {
        messages.push(`You can attach up to ${MAX_ASSIGNMENT_FILES} files.`);
        break;
      }
      nextFiles.push(file);
    }

    setSelectedFiles(nextFiles);

    setFileError(messages.join(" "));
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function removeFile(index: number) {
    setSelectedFiles((currentFiles) => currentFiles.filter((_, fileIndex) => fileIndex !== index));
    setFileError("");
  }

  function sendSubmission(formData: FormData, accessToken: string, endpoint: string, publishableKey: string) {
    return new Promise<SubmitResponse>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("POST", endpoint);
      request.setRequestHeader("apikey", publishableKey);
      request.setRequestHeader("Authorization", `Bearer ${accessToken}`);

      request.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable) return;
        setProgress(Math.min(90, Math.round((event.loaded / event.total) * 90)));
      });

      request.addEventListener("load", () => {
        let result: SubmitResponse = {};
        try {
          result = JSON.parse(request.responseText) as SubmitResponse;
        } catch {
          result = {};
        }

        if (request.status >= 200 && request.status < 300) {
          resolve(result);
          return;
        }
        reject(new Error(result.error || "We could not submit the assignment. Please try again."));
      });

      request.addEventListener("error", () => {
        reject(new Error("The upload could not reach StudyAssist. Check your connection and try again."));
      });
      request.addEventListener("abort", () => {
        reject(new Error("The upload was cancelled. You can try again when you are ready."));
      });
      request.send(formData);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || successId) return;

    const form = formRef.current;
    if (!form?.reportValidity()) return;
    if (selectedFiles.length === 0) {
      setFileError("Attach at least one assignment instruction or supporting document.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setProgress(0);
    setErrorMessage("");
    setFileError("");

    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.auth.getSession();
      const session = data.session;
      if (error || !session?.access_token) {
        throw new Error("Your sign-in session has expired. Sign in again and retry.");
      }

      const config = getSupabaseConfig();
      if (!config) throw new Error("Assignment uploads are not configured yet.");

      const formData = new FormData(form);
      for (const file of selectedFiles) formData.append("files", file, file.name);

      const endpoint = `${config.url.replace(/\/$/, "")}/functions/v1/submit-assignment`;
      setProgress(1);
      const result = await sendSubmission(formData, session.access_token, endpoint, config.publishableKey);

      if (!result.assignmentId) {
        throw new Error("The assignment was submitted, but its confirmation could not be read. Check your assignment history.");
      }

      setProgress(100);
      setSuccessId(result.assignmentId);
    } catch (error) {
      setProgress(0);
      setErrorMessage(error instanceof Error ? error.message : "We could not submit the assignment. Please try again.");
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <form ref={formRef} className="assignment-form" onSubmit={handleSubmit}>
      <div className="assignment-form-intro">
        <p>Share the instructions and tell us what kind of academic guidance would help you learn.</p>
        <p>Submitting requests tutoring, explanations, research guidance, or feedback. StudyAssist does not complete examinations or submit work in your place.</p>
      </div>

      <div className="assignment-form-grid">
        <div className="form-field assignment-field-full">
          <label htmlFor="assignment-title">Assignment title <span aria-hidden="true">*</span></label>
          <input id="assignment-title" name="title" required minLength={3} maxLength={140} placeholder="For example, Statistics coursework 2" />
        </div>

        <div className="form-field">
          <label htmlFor="assignment-subject">Subject <span aria-hidden="true">*</span></label>
          <select id="assignment-subject" name="subject" required defaultValue="">
            <option value="" disabled>Select a subject</option>
            {ASSIGNMENT_SUBJECTS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="assignment-assistance">Type of support <span aria-hidden="true">*</span></label>
          <select id="assignment-assistance" name="assistance_type" required defaultValue="">
            <option value="" disabled>Choose the guidance you need</option>
            {ASSISTANCE_TYPES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
          </select>
        </div>

        <div className="form-field assignment-field-full">
          <label htmlFor="assignment-description">Assignment description <span aria-hidden="true">*</span></label>
          <textarea id="assignment-description" name="description" required minLength={20} maxLength={4000} placeholder="What are you working on, and where would guidance be most useful?" />
          <span className="field-hint">Give enough context for a tutor to understand the learning support you are requesting.</span>
        </div>

        <div className="form-field">
          <label htmlFor="assignment-deadline">Deadline <span aria-hidden="true">*</span></label>
          <input id="assignment-deadline" name="deadline_local" type="datetime-local" required />
        </div>

        <div className="form-field">
          <label htmlFor="assignment-timezone">Deadline time zone <span aria-hidden="true">*</span></label>
          <input id="assignment-timezone" name="deadline_timezone" list="assignment-time-zones" required maxLength={100} defaultValue="Africa/Nairobi" placeholder="Type an IANA time zone" />
          <datalist id="assignment-time-zones">
            {COMMON_TIME_ZONES.map((timeZone) => <option value={timeZone} key={timeZone} />)}
          </datalist>
          <span className="field-hint">Choose the zone for the time you entered. You can type another valid IANA time zone.</span>
        </div>

        <div className="form-field">
          <label htmlFor="assignment-level">Academic level</label>
          <select id="assignment-level" name="academic_level" defaultValue="">
            <option value="">Select if you wish</option>
            {ACADEMIC_LEVELS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="assignment-language">Preferred language</label>
          <input id="assignment-language" name="preferred_language" maxLength={80} placeholder="For example, English or Kiswahili" />
        </div>

        <div className="form-field">
          <label htmlFor="assignment-institution">Institution</label>
          <input id="assignment-institution" name="institution_name" maxLength={160} placeholder="School, college, or university" />
        </div>

        <div className="form-field">
          <label htmlFor="assignment-course">Course name</label>
          <input id="assignment-course" name="course_name" maxLength={120} placeholder="Course or unit name" />
        </div>

        <div className="form-field">
          <label htmlFor="assignment-budget">Budget (optional)</label>
          <input id="assignment-budget" name="budget_amount" inputMode="decimal" maxLength={32} placeholder="Leave blank if undecided" />
          <span className="field-hint">This records your stated budget. It is not a payment or a quotation.</span>
        </div>

        <div className="form-field">
          <label htmlFor="assignment-currency">Budget currency</label>
          <select id="assignment-currency" name="budget_currency" defaultValue="KES">
            {ASSIGNMENT_CURRENCIES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
          </select>
        </div>

        <div className="form-field assignment-field-full">
          <label htmlFor="assignment-notes">Additional instructions</label>
          <textarea id="assignment-notes" name="additional_notes" maxLength={2000} placeholder="Anything else the tutor should know about your learning goals?" />
        </div>

        <div className="form-field assignment-field-full">
          <label htmlFor="assignment-files">Instructions or supporting documents <span aria-hidden="true">*</span></label>
          <div
            className={`assignment-dropzone${isDragging ? " assignment-dropzone-active" : ""}`}
            onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
            }}
            onDrop={handleDrop}
          >
            <span className="assignment-dropzone-mark" aria-hidden="true">↑</span>
            <p>Drop your files here, or choose from your device</p>
            <span className="field-hint">PDF, DOCX, PPTX, TXT, JPG, or PNG. Up to {MAX_ASSIGNMENT_FILES} files, {MAX_ASSIGNMENT_FILE_BYTES / (1024 * 1024)} MB each.</span>
            <input
              id="assignment-files"
              type="file"
              accept={ACCEPTED_ASSIGNMENT_FILE_TYPES}
              multiple
              onChange={handleFileChange}
              disabled={isSubmitting || Boolean(successId)}
              aria-describedby="assignment-file-help assignment-file-error"
            />
            <span id="assignment-file-help" className="sr-only">Choose up to five supporting files. Each file can be up to ten megabytes.</span>
          </div>
          {selectedFiles.length > 0 && (
            <ul className="assignment-file-list" aria-label="Selected files">
              {selectedFiles.map((file, index) => (
                <li key={`${file.name}-${file.size}-${index}`}>
                  <span>{file.name}<small>{(file.size / (1024 * 1024)).toFixed(2)} MB</small></span>
                  <button type="button" onClick={() => removeFile(index)} disabled={isSubmitting || Boolean(successId)} aria-label={`Remove ${file.name}`}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <span id="assignment-file-error" className="assignment-error" role="alert">{fileError}</span>
        </div>
      </div>

      {isSubmitting && (
        <div className="assignment-progress" aria-live="polite">
          <label htmlFor="assignment-progress">{progress >= 90 ? "Saving assignment details…" : "Uploading and checking your documents…"}</label>
          <progress id="assignment-progress" max={100} value={progress} />
          <span>{progress}%</span>
        </div>
      )}

      {errorMessage && <p className="assignment-alert assignment-alert-error" role="alert">{errorMessage}</p>}
      {successId && (
        <div className="assignment-alert assignment-alert-success" role="status">
          <p>Your assignment was submitted successfully. Its current status is Submitted.</p>
          <Link href={`/student/assignments/${successId}`}>Open your assignment</Link>
        </div>
      )}

      <div className="assignment-form-actions">
        <button className="button" type="submit" disabled={isSubmitting || Boolean(successId)}>
          {isSubmitting ? "Submitting…" : successId ? "Submitted" : "Submit assignment"}
        </button>
        <Link className="button button-outline" href="/student/dashboard">Cancel</Link>
      </div>
      <p className="assignment-integrity-note">By submitting, you are requesting educational guidance. Do not upload exam answers, other students’ personal information, or material you are not permitted to share.</p>
    </form>
  );
}
