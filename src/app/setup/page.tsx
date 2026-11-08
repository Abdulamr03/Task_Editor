import { redirect } from "next/navigation";
import { hasAnyUser } from "@/lib/auth";
import { AuthCard, AuthForm } from "@/components/auth-form";
import { createAdmin } from "./actions";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  // Setup is only for the very first account.
  if (await hasAnyUser()) redirect("/login");

  return (
    <AuthCard title="Welcome" subtitle="Create the admin account. This page only works once.">
      <AuthForm
        action={createAdmin}
        submitLabel="Create admin account"
        fields={[
          { name: "name", label: "Name", type: "text", autoComplete: "name" },
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password (min. 8 characters)", type: "password", autoComplete: "new-password" },
          { name: "confirm", label: "Repeat password", type: "password", autoComplete: "new-password" },
        ]}
      />
    </AuthCard>
  );
}
