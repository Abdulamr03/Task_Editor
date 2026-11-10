import { redirect } from "next/navigation";
import { hasAnyUser } from "@/lib/auth";
import { AuthCard, AuthForm } from "@/components/auth-form";
import { login } from "./actions";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  expired: "Your login has ended. Please log in again.",
  switch: "Log in with the account you want to use.",
  deleted: "Your account was deleted.",
  password: "Password changed. Please log in with your new password.",
  everywhere: "You were logged out on all devices.",
  "signed-out": "You're logged out.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  // No account yet: create the admin first.
  if (!(await hasAnyUser())) redirect("/setup");
  const { reason } = await searchParams;
  const message = reason ? MESSAGES[reason] : undefined;

  return (
    <AuthCard title="Task Editor" subtitle="Log in to continue.">
      {message && (
        <p role="status" className="mb-4 rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-sm text-blue-800 dark:text-blue-200">
          {message}
        </p>
      )}
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
