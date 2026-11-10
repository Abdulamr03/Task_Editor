"use client";

import { useState, useTransition } from "react";
import type { Role } from "@prisma/client";
import { deleteAccount, setAccountRole } from "./actions";

export type AccountRow = { id: string; name: string; email: string; role: Role; isMe: boolean; since: string };

// List of everyone who can log in, with role and remove (admins only).
export function AccountsList({ accounts }: { accounts: AccountRow[] }) {
  return (
    <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
      {accounts.map((a) => (
        <Row key={a.id} account={a} />
      ))}
    </ul>
  );
}

function Row({ account }: { account: AccountRow }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const run = (fn: () => Promise<string | undefined>) =>
    startTransition(async () => {
      setError((await fn()) ?? "");
    });

  return (
    <li className={`flex flex-col gap-2 p-4 sm:flex-row sm:items-center ${pending ? "opacity-60" : ""}`}>
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={account.name} />
        <span className="min-w-0">
          <span className="block truncate font-medium">
            {account.name}
            {account.isMe && <span className="ml-2 text-xs font-normal text-slate-500">(you)</span>}
          </span>
          <span className="block truncate text-sm text-slate-500">{account.email}</span>
          {error && <span className="block text-sm text-red-600 dark:text-red-400">{error}</span>}
        </span>
      </span>
      <span className="flex items-center gap-2 pl-11 sm:pl-0">
        <select
          aria-label={`Role of ${account.name}`}
          value={account.role}
          disabled={pending}
          onChange={(e) => {
            const role = e.target.value as Role;
            if (account.isMe && role === "VIEWER" && !confirm("Make yourself a viewer? You won't be able to change anything any more.")) return;
            run(() => setAccountRole(account.id, role));
          }}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
        >
          <option value="ADMIN">Admin — can change everything</option>
          <option value="VIEWER">Viewer — can only look</option>
        </select>
        {!account.isMe && (
          <button
            type="button"
            disabled={pending}
            aria-label={`Remove ${account.name}`}
            title="Remove account"
            onClick={() => {
              if (confirm(`Remove ${account.name}'s account? They won't be able to log in any more. Your data is not affected.`)) {
                run(() => deleteAccount(account.id));
              }
            }}
            className="h-8 w-8 rounded-md text-red-600 hover:bg-red-500/10 dark:text-red-400"
          >
            ✕
          </button>
        )}
      </span>
    </li>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-blue-600 font-semibold text-white ${size === "sm" ? "h-7 w-7 text-xs" : "h-8 w-8 text-sm"}`}
    >
      {initials || "?"}
    </span>
  );
}
