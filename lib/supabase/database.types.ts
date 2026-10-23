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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
