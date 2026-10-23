import { Suspense } from "react";
import { AuthShell } from "@/app/components/auth/auth-shell";
import { UpdatePasswordForm } from "@/app/components/auth/update-password-form";
import { requireSignedInProfile } from "@/lib/auth/guards";

async function ResetPasswordPageContent() {
  await requireSignedInProfile();
  return <UpdatePasswordForm />;
}

export default function UpdatePasswordPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="auth-loading-card">Checking your reset link…</div>}>
        <ResetPasswordPageContent />
      </Suspense>
    </AuthShell>
  );
}
