import { redirect } from "next/navigation";
import { hasAnyUser } from "@/lib/auth";
import { AuthCard, AuthForm } from "@/components/auth-form";
import { login } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // No account yet: create the admin first.
  if (!(await hasAnyUser())) redirect("/setup");

  return (
    <AuthCard title="Task Editor" subtitle="Log in to continue.">
      <AuthForm
        action={login}
        submitLabel="Log in"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
        ]}
      />
    </AuthCard>
  );
}
