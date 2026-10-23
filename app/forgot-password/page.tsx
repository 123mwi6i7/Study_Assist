import { AuthShell } from "@/app/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/app/components/auth/forgot-password-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function ForgotPasswordPage() {
  return (
    <AuthShell showSetupNotice={!isSupabaseConfigured()}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
