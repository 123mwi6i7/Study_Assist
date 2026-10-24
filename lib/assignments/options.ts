export const ASSIGNMENT_SUBJECTS = [
  { value: "mathematics_statistics", label: "Mathematics and statistics" },
  { value: "computer_science_programming", label: "Computer science and programming" },
  { value: "business_management", label: "Business and management" },
  { value: "accounting_finance", label: "Accounting and finance" },
  { value: "economics", label: "Economics" },
  { value: "research_methodology", label: "Research methodology" },
  { value: "academic_writing_guidance", label: "Academic writing guidance" },
  { value: "referencing_citation_support", label: "Referencing and citation support" },
  { value: "proofreading_draft_feedback", label: "Proofreading and draft feedback" },
  { value: "presentation_report_feedback", label: "Presentation and report feedback" },
  { value: "other_subjects", label: "Other subjects" },
] as const;

export const ASSISTANCE_TYPES = [
  { value: "explain_instructions", label: "Explain assignment instructions" },
  { value: "one_to_one_tutoring", label: "One-to-one tutoring" },
  { value: "explain_concepts_calculations", label: "Explain concepts or calculations" },
  { value: "programming_guidance", label: "Programming guidance" },
  { value: "research_guidance", label: "Research guidance" },
  { value: "review_student_draft", label: "Review a student-written draft" },
  { value: "proofreading_referencing", label: "Proofreading and referencing" },
  { value: "feedback_structure_arguments", label: "Feedback on structure and arguments" },
  { value: "other_permitted_support", label: "Other permitted academic support" },
] as const;

export const ACADEMIC_LEVELS = [
  { value: "secondary", label: "Secondary school" },
  { value: "certificate", label: "Certificate" },
  { value: "diploma", label: "Diploma" },
  { value: "undergraduate", label: "Undergraduate" },
  { value: "postgraduate", label: "Postgraduate" },
  { value: "doctoral", label: "Doctoral" },
  { value: "other", label: "Other" },
] as const;

export const ASSIGNMENT_CURRENCIES = [
  { value: "KES", label: "KES — Kenyan shilling" },
  { value: "USD", label: "USD — US dollar" },
  { value: "EUR", label: "EUR — euro" },
  { value: "GBP", label: "GBP — pound sterling" },
  { value: "NGN", label: "NGN — Nigerian naira" },
  { value: "ZAR", label: "ZAR — South African rand" },
  { value: "UGX", label: "UGX — Ugandan shilling" },
  { value: "TZS", label: "TZS — Tanzanian shilling" },
  { value: "GHS", label: "GHS — Ghanaian cedi" },
  { value: "INR", label: "INR — Indian rupee" },
  { value: "CAD", label: "CAD — Canadian dollar" },
  { value: "AUD", label: "AUD — Australian dollar" },
  { value: "SGD", label: "SGD — Singapore dollar" },
  { value: "AED", label: "AED — UAE dirham" },
  { value: "SAR", label: "SAR — Saudi riyal" },
  { value: "KWD", label: "KWD — Kuwaiti dinar" },
  { value: "JPY", label: "JPY — Japanese yen" },
] as const;

export const COMMON_TIME_ZONES = [
  "Africa/Nairobi",
  "Africa/Accra",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Toronto",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;

export const MAX_ASSIGNMENT_FILES = 5;
export const MAX_ASSIGNMENT_FILE_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_ASSIGNMENT_FILE_TYPES = ".pdf,.docx,.pptx,.txt,.jpg,.jpeg,.png";

export const ACCEPTED_ASSIGNMENT_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".pptx",
  ".txt",
  ".jpg",
  ".jpeg",
  ".png",
] as const;

export type AssignmentStatus = "draft" | "submitted";
