import { AuthShell } from "@/app/components/auth/auth-shell";
import { LoginForm } from "@/app/components/auth/login-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function LoginPage() {
  return (
    <AuthShell showSetupNotice={!isSupabaseConfigured()}>
      <LoginForm />
    </AuthShell>
  );
}
