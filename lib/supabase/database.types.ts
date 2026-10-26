export type UserRole = "student" | "tutor" | "admin";

export type TutorApplicationStatus = "pending_review" | "approved" | "rejected" | "suspended";
export type AssignmentStatus = "draft" | "submitted" | "awaiting_payment";
export type QuotationStatus = "pending" | "accepted" | "not_selected" | "withdrawn";

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
  tutor_professional_name: string | null;
  tutor_qualifications: string | null;
  tutor_experience: string | null;
  tutor_timezone: string;
  tutor_availability: string | null;
  tutor_min_price_minor: number | string | null;
  tutor_max_price_minor: number | string | null;
  tutor_price_currency: string | null;
  tutor_is_active: boolean;
  tutor_review_reason: string | null;
  tutor_reviewed_at: string | null;
  tutor_reviewed_by: string | null;
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
  status: AssignmentStatus;
  submitted_at: string | null;
  accepted_quotation_id: string | null;
  accepted_at: string | null;
  accepted_terms: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type Quotation = {
  id: string;
  assignment_id: string;
  tutor_id: string;
  price_amount_minor: number | string;
  currency: string;
  service_description: string;
  estimated_delivery_hours: number;
  revision_terms: string;
  additional_notes: string | null;
  status: QuotationStatus;
  created_at: string;
  updated_at: string;
};

export type TutorApplicationReview = {
  id: string;
  tutor_id: string;
  reviewed_by: string;
  decision: "approved" | "rejected" | "suspended";
  reason: string | null;
  created_at: string;
};

export type PublicTutor = {
  id: string;
  professional_name: string;
  country: string;
  bio: string | null;
  subjects: string[];
  languages: string[];
  qualifications: string | null;
  experience: string | null;
  timezone: string;
  availability: string | null;
  min_price_minor: number | string | null;
  max_price_minor: number | string | null;
  price_currency: string | null;
};

export type TutorApplication = {
  id: string;
  professional_name: string;
  country: string;
  application_status: TutorApplicationStatus;
  review_reason: string | null;
  subjects: string[];
  languages: string[];
  bio: string | null;
  qualifications: string | null;
  experience: string | null;
  timezone: string;
  availability: string | null;
  min_price_minor: number | string | null;
  max_price_minor: number | string | null;
  price_currency: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export type TutorOpportunity = {
  id: string;
  title: string;
  subject: string;
  description: string;
  assistance_type: string;
  academic_level: string | null;
  preferred_language: string | null;
  deadline_at: string;
  deadline_timezone: string;
  budget_amount_minor: number | string | null;
  budget_currency: string | null;
  status: "submitted";
  submitted_at: string;
};

export type TutorQuotation = {
  id: string;
  assignment_id: string;
  assignment_title: string;
  subject: string;
  deadline_at: string;
  deadline_timezone: string;
  assignment_status: AssignmentStatus;
  price_amount_minor: number | string;
  currency: string;
  service_description: string;
  estimated_delivery_hours: number;
  revision_terms: string;
  additional_notes: string | null;
  quotation_status: QuotationStatus;
  created_at: string;
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
        Insert: Omit<Assignment, "id" | "created_at" | "updated_at" | "submitted_at" | "accepted_quotation_id" | "accepted_at" | "accepted_terms"> &
          Partial<Pick<Assignment, "id" | "created_at" | "updated_at" | "submitted_at" | "accepted_quotation_id" | "accepted_at" | "accepted_terms">>;
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
      quotations: {
        Row: Quotation;
        Insert: Omit<Quotation, "id" | "created_at" | "updated_at" | "status"> &
          Partial<Pick<Quotation, "id" | "created_at" | "updated_at" | "status">>;
        Update: Partial<Quotation>;
        Relationships: [];
      };
      tutor_application_reviews: {
        Row: TutorApplicationReview;
        Insert: Omit<TutorApplicationReview, "id" | "created_at"> &
          Partial<Pick<TutorApplicationReview, "id" | "created_at">>;
        Update: Partial<TutorApplicationReview>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      update_tutor_marketplace_profile: {
        Args: {
          p_professional_name: string;
          p_bio: string;
          p_country: string;
          p_subjects: string[];
          p_qualifications: string;
          p_experience: string;
          p_languages: string[];
          p_timezone: string;
          p_availability: string;
          p_min_price_minor: number | null;
          p_max_price_minor: number | null;
          p_price_currency: string | null;
        };
        Returns: string;
      };
      review_tutor_application: {
        Args: { p_tutor_id: string; p_status: string; p_reason?: string | null };
        Returns: undefined;
      };
      get_tutor_applications: {
        Args: Record<PropertyKey, never>;
        Returns: TutorApplication[];
      };
      search_approved_tutors: {
        Args: {
          p_subject?: string | null;
          p_country?: string | null;
          p_language?: string | null;
          p_availability?: string | null;
          p_expertise?: string | null;
          p_max_price_minor?: number | null;
          p_price_currency?: string | null;
        };
        Returns: PublicTutor[];
      };
      get_quotation_tutors: {
        Args: { p_quotation_ids: string[] };
        Returns: PublicTutor[];
      };
      get_tutor_opportunities: {
        Args: Record<PropertyKey, never>;
        Returns: TutorOpportunity[];
      };
      get_tutor_quotations: {
        Args: Record<PropertyKey, never>;
        Returns: TutorQuotation[];
      };
      submit_tutor_quotation: {
        Args: {
          p_assignment_id: string;
          p_price_amount_minor: number;
          p_currency: string;
          p_service_description: string;
          p_estimated_delivery_hours: number;
          p_revision_terms: string;
          p_additional_notes?: string | null;
        };
        Returns: string;
      };
      accept_tutor_quotation: {
        Args: { p_quotation_id: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
