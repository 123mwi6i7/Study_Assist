import { AuthShell } from "@/app/components/auth/auth-shell";
import { RegisterForm } from "@/app/components/auth/register-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function RegisterPage() {
  return (
    <AuthShell showSetupNotice={!isSupabaseConfigured()}>
      <RegisterForm />
    </AuthShell>
  );
}
