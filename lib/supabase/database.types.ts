export type UserRole = "student" | "tutor" | "admin";

export type TutorApplicationStatus = "pending_review" | "approved" | "rejected";

export type Profile = {
  id: string;
  full_name: string;
  country: string;
  phone_e164: string;
  role: UserRole;
  tutor_application_status: TutorApplicationStatus | null;
  tutor_subjects: string[];
  tutor_languages: string[];
  tutor_bio: string | null;
  terms_accepted_at: string;
  privacy_accepted_at: string;
  created_at: string;
  updated_at: string;
};

export type Assignment = {
  id: string;
  student_id: string;
  title: string;
  subject: string;
  course_name: string | null;
  description: string;
  academic_level: string | null;
  institution_name: string | null;
  assistance_type: string;
  preferred_language: string | null;
  deadline_at: string;
  deadline_timezone: string;
  budget_amount_minor: number | string | null;
  budget_currency: string | null;
  additional_notes: string | null;
  status: "draft" | "submitted";
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AssignmentFile = {
  id: string;
  assignment_id: string;
  uploaded_by: string;
  storage_path: string;
  original_filename: string;
  file_size_bytes: number;
  content_type: string;
  created_at: string;
};

// This small type describes the table created by the migration in supabase/.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
        Relationships: [];
      };
      assignments: {
        Row: Assignment;
        Insert: Omit<Assignment, "id" | "created_at" | "updated_at" | "submitted_at"> &
          Partial<Pick<Assignment, "id" | "created_at" | "updated_at" | "submitted_at">>;
        Update: Partial<Assignment>;
        Relationships: [];
      };
      assignment_files: {
        Row: AssignmentFile;
        Insert: Omit<AssignmentFile, "id" | "created_at"> &
          Partial<Pick<AssignmentFile, "id" | "created_at">>;
        Update: Partial<AssignmentFile>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
