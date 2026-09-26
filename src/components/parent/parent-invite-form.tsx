"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "@/i18n/client";
import { requestParentLinkAction } from "@/app/actions/parent-actions";
import { useToast } from "@/components/shared/feedback";

interface ParentInviteFormProps {
  disabled?: boolean;
}

type Outcome =
  | "created"
  | "existing-pending"
  | "already-active"
  | "unknown-student"
  | "rate_limited"
  | "error";

/**
 * R7 — Parent invite form. Submits an email; the action always
 * returns 200 + a generic outcome key to preserve email-enumeration
 * resistance per phase doc §5.
 */
export function ParentInviteForm({ disabled }: ParentInviteFormProps) {
  const { t } = useTranslations();
  const [email, setEmail] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) return;
    const trimmed = email.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await requestParentLinkAction({
        studentEmail: trimmed,
      });
      if (!result.success) {
        setOutcome("error");
        toast.error({
          title: t("parent.invite.toast.error"),
          description: result.error ?? "",
        });
        return;
      }
      const next = result.data?.outcome as Outcome | undefined;
      setOutcome(next ?? "error");
      toast.info({
        title: t(toastKeyFor(next)),
      });
      if (next === "created" || next === "existing-pending") {
        setEmail("");
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bento-card-static space-y-4 p-5 sm:p-6"
    >
      <div>
        <label
          htmlFor="parent-invite-email"
          className="text-xs font-semibold uppercase tracking-wider text-secondary"
        >
          {t("parent.invite.emailLabel")}
        </label>
        <p className="mt-1 text-[11px] text-secondary">
          {t("parent.invite.emailHelp")}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="parent-invite-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          disabled={disabled || isPending}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("parent.invite.emailPlaceholder")}
          className="flex-1 rounded-lg border border-outline-variant bg-surface-0 px-3 py-2 text-sm shadow-2xs focus:border-rose-600 focus:outline-hidden focus:ring-2 focus:ring-rose-200"
        />
        <button
          type="submit"
          disabled={disabled || isPending || !email.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-rose-700 disabled:opacity-60 transition-colors"
        >
          {isPending ? t("parent.invite.submitting") : t("parent.invite.submit")}
        </button>
      </div>
      {outcome ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {t(outcomeKeyFor(outcome))}
        </p>
      ) : null}
      {disabled ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {t("parent.invite.rateLimited")}
        </p>
      ) : null}
    </form>
  );
}

function outcomeKeyFor(outcome: Outcome) {
  switch (outcome) {
    case "created":
      return "parent.invite.outcome.created";
    case "existing-pending":
      return "parent.invite.outcome.existingPending";
    case "already-active":
      return "parent.invite.outcome.alreadyActive";
    case "unknown-student":
      return "parent.invite.outcome.unknown";
    case "rate_limited":
      return "parent.invite.outcome.rateLimited";
    default:
      return "parent.invite.outcome.error";
  }
}

function toastKeyFor(outcome: Outcome | undefined) {
  if (!outcome || outcome === "error") return "parent.invite.toast.error";
  if (outcome === "unknown-student") return "parent.invite.toast.unknown";
  return "parent.invite.toast.created";
}
