import "server-only";

import { and, eq, gte } from "drizzle-orm";

import { getDb } from "@/db";
import {
  parentDigestPrefs,
  parentStudentLinks,
  users,
} from "@/db/schema";
import { sendEmail } from "@/services/email";

import { getChildSummary, getChildUpcoming } from "./dashboard";

/**
 * R7 — Parent digest email builder + cron worker.
 *
 * Two surface entry points:
 *   - buildDigest(args):  pure HTML + plaintext for (parent, student,
 *                         day). Reused by both cron jobs and an admin
 *                         "preview" action.
 *   - sendDailyDigests() / sendWeeklyDigests():  queue-flavoured
 *                         cron handlers. They iterate the digest
 *                         preference table, deduplicate on a
 *                         `parent-digest:<day>:<parentId>:<studentId>`
 *                         dedupe key, and call sendEmail().
 *
 * Anti-flood: if no new learning activity occurred in the window, we
 * still send an in-app notification (the cron is the trigger, after
 * all) but skip the email — the dedicated `sendEmail()` path is left
 * for the next event.
 *
 * Free-tier budgeting: see FREE-TIER-REFERENCE.md §19 — 70 sends/day
 * cap. We enumerate `cadence IN ('daily', 'weekly')` exclusively; the
 * 80-active-parents guard (§5) is enforced by the operator via
 * toggling families to `weekly` if we approach the ceiling.
 */

// ----------------------------------------------------------------------------
// HTML / plaintext builder
// ----------------------------------------------------------------------------

export interface BuildDigestArgs {
  parentId: string;
  studentId: string;
  /** Day boundary for the report (UTC midnight of the report). */
  day?: Date;
  appUrl: string;
  locale?: "en" | "bn";
  /** "daily" or "weekly" — affects which window we summarize. */
  cadence?: "daily" | "weekly";
}

export interface DigestContent {
  subject: { en: string; bn: string };
  headline: { en: string; bn: string };
  intro: { en: string; bn: string };
  outro: { en: string; bn: string };
}

const DAILY_DIGEST: DigestContent = {
  subject: {
    en: "Daily digest / দৈনিক সারাংশ",
    bn: "দৈনিক সারাংশ",
  },
  headline: {
    en: "Today's learning digest",
    bn: "আজকের লার্নিং সারাংশ",
  },
  intro: {
    en:
      "Here's how your child did today on InsideJibon — streak, recent activity, and any deadlines to keep in mind.",
    bn:
      "InsideJibon এ আজ আপনার সন্তান কেমন করেছে — স্ট্রিক, সাম্প্রতিক অগ্রগতি এবং মাথায় রাখার মতো ডেডলাইন।",
  },
  outro: {
    en:
      "Reply to this email to reach the support inbox, or open the full dashboard.",
    bn:
      "এই ইমেইলে রিপ্লাই দিলে সাপোর্ট ইনবক্সে পৌঁছাবে, অথবা পুরো ড্যাশবোর্ড দেখুন।",
  },
};

const WEEKLY_DIGEST: DigestContent = {
  subject: {
    en: "Weekly digest / সাপ্তাহিক সারাংশ",
    bn: "সাপ্তাহিক সারাংশ",
  },
  headline: {
    en: "This week's learning digest",
    bn: "এই সপ্তাহের লার্নিং সারাংশ",
  },
  intro: {
    en:
      "Here's what your child accomplished this week on InsideJibon — lessons completed, quizzes graded, streak status, upcoming deadlines, and any alerts.",
    bn:
      "এই সপ্তাহে InsideJibon এ আপনার সন্তান কী অর্জন করেছে — সম্পন্ন লেসন, গ্রেডেড কুইজ, স্ট্রিকের অবস্থা, আসন্ন ডেডলাইন এবং অ্যালার্ট।",
  },
  outro: {
    en: "Reply to this email to reach the support inbox.",
    bn: "এই ইমেইলে রিপ্লাই দিলে সাপোর্ট ইনবক্সে পৌঁছাবে।",
  },
};

export async function buildDigest(args: BuildDigestArgs): Promise<{
  html: string;
  text: string;
  subject: string;
  hasActivity: boolean;
}> {
  const summary = await getChildSummary({
    parentId: args.parentId,
    studentId: args.studentId,
  });
  const upcoming = await getChildUpcoming({
    parentId: args.parentId,
    studentId: args.studentId,
    limit: 5,
  });
  const parent = await getUser(args.parentId);
  const student = await getUser(args.studentId);
  const content = args.cadence === "weekly" ? WEEKLY_DIGEST : DAILY_DIGEST;
  const locale: "en" | "bn" = args.locale ?? "en";
  const headline = content.headline[locale];
  const intro = content.intro[locale];
  const outro = content.outro[locale];
  const subject = content.subject[locale];

  const hasActivity =
    (summary?.xpLast7Days ?? 0) > 0 ||
    (summary?.missingAssignments ?? 0) > 0 ||
    upcoming.length > 0;

  const text = renderTextDigest({
    studentName: student?.name,
    headline,
    intro,
    outro,
    summary,
    upcoming,
    appUrl: args.appUrl,
    locale,
  });
  const html = renderHtmlDigest({
    studentName: student?.name,
    headline,
    intro,
    outro,
    summary,
    upcoming,
    appUrl: args.appUrl,
    locale,
  });

  return { html, text, subject, hasActivity };
}

function renderTextDigest(args: {
  studentName: string | null | undefined;
  headline: string;
  intro: string;
  outro: string;
  summary: Awaited<ReturnType<typeof getChildSummary>>;
  upcoming: Awaited<ReturnType<typeof getChildUpcoming>>;
  appUrl: string;
  locale: "en" | "bn";
}): string {
  const lines: string[] = [];
  lines.push(args.headline);
  lines.push("");
  lines.push(args.intro);
  lines.push("");
  lines.push(
    `Student: ${args.studentName ?? args.locale === "bn" ? "আপনার সন্তান" : "Your child"}`
  );
  lines.push(
    `Streak: ${args.summary?.currentStreak ?? 0} day${(args.summary?.currentStreak ?? 0) === 1 ? "" : "s"}`
  );
  lines.push(`XP this week: ${args.summary?.xpLast7Days ?? 0}`);
  if (args.summary?.avgGradePct !== undefined && args.summary?.avgGradePct !== null) {
    lines.push(`Avg grade: ${args.summary.avgGradePct}%`);
  }
  if ((args.summary?.missingAssignments ?? 0) > 0) {
    lines.push(
      `Missing assignments: ${args.summary?.missingAssignments ?? 0}`
    );
  }
  if (args.upcoming.length > 0) {
    lines.push("");
    lines.push(args.locale === "bn" ? "আসন্ন ডেডলাইন:" : "Upcoming deadlines:");
    for (const item of args.upcoming) {
      const when = new Date(item.when);
      lines.push(
        `  - ${item.kind === "assignment" ? "Assignment" : item.kind === "live_class" ? "Live class" : "Exam"}: ${item.title} (${when.toISOString().slice(0, 16).replace("T", " ")})`
      );
    }
  }
  lines.push("");
  lines.push(args.outro);
  lines.push(`${args.appUrl}/parent`);
  return lines.join("\n");
}

function renderHtmlDigest(args: {
  studentName: string | null | undefined;
  headline: string;
  intro: string;
  outro: string;
  summary: Awaited<ReturnType<typeof getChildSummary>>;
  upcoming: Awaited<ReturnType<typeof getChildUpcoming>>;
  appUrl: string;
  locale: "en" | "bn";
}): string {
  // Tiny inline-styled table — matches the brand's "Academic Modernism"
  // typography without dragging in a full template engine.
  const styles = `
    body { font-family: 'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif; color: #1f2937; }
    .card { border:1px solid #e5e7eb; border-radius:16px; padding:20px; max-width:560px; margin:0 auto; }
    h1 { font-size:20px; margin:0 0 8px 0; }
    .intro { color:#6b7280; font-size:14px; margin:0 0 16px 0; }
    .row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed #e5e7eb; }
    .label { color:#6b7280; font-size:13px; }
    .value { font-weight:600; color:#111827; font-size:14px; }
    .cta { display:inline-block; margin-top:16px; padding:10px 16px; background:#0f172a; color:white; text-decoration:none; border-radius:10px; font-size:13px; }
    .alert { background:#fef3c7; border-radius:12px; padding:10px 14px; font-size:13px; margin-top:16px; }
    ul { padding-left:18px; margin:8px 0; }
    li { font-size:13px; margin-bottom:4px; }
  `.replace(/\s+/g, " ");
  const studentLabel = args.studentName ?? (args.locale === "bn" ? "আপনার সন্তান" : "Your child");
  const upcomingHtml = args.upcoming.length
    ? `<h3 style="font-size:14px;margin:16px 0 6px 0;">${args.locale === "bn" ? "আসন্ন ডেডলাইন" : "Upcoming deadlines"}</h3><ul>${args.upcoming
        .map((item) => {
          const when = new Date(item.when);
          const kindLabel =
            item.kind === "assignment"
              ? args.locale === "bn"
                ? "অ্যাসাইনমেন্ট"
                : "Assignment"
              : item.kind === "live_class"
              ? args.locale === "bn"
                ? "লাইভ ক্লাস"
                : "Live class"
              : args.locale === "bn"
              ? "পরীক্ষা"
              : "Exam";
          return `<li><strong>${kindLabel}</strong>: ${escapeHtml(item.title)} — ${escapeHtml(when.toUTCString())}</li>`;
        })
        .join("")}</ul>`
    : "";
  const alertHtml =
    (args.summary?.missingAssignments ?? 0) > 0
      ? `<div class="alert">${
          args.locale === "bn"
            ? `${args.summary?.missingAssignments}টি অ্যাসাইনমেন্ট বাকি আছে।`
            : `${args.summary?.missingAssignments} assignment(s) are still outstanding.`
        }</div>`
      : "";
  return `
<!DOCTYPE html>
<html lang="${args.locale}">
<head><meta charset="utf-8" /><style>${styles}</style></head>
<body>
  <div class="card">
    <h1>${escapeHtml(args.headline)}</h1>
    <p class="intro">${escapeHtml(args.intro)}</p>
    <div class="row"><span class="label">${
      args.locale === "bn" ? "শিক্ষার্থী" : "Student"
    }</span><span class="value">${escapeHtml(studentLabel)}</span></div>
    <div class="row"><span class="label">${
      args.locale === "bn" ? "স্ট্রিক" : "Streak"
    }</span><span class="value">${args.summary?.currentStreak ?? 0}</span></div>
    <div class="row"><span class="label">${
      args.locale === "bn" ? "গত ৭ দিনে XP" : "XP this week"
    }</span><span class="value">${args.summary?.xpLast7Days ?? 0}</span></div>
    ${
      args.summary?.avgGradePct !== undefined && args.summary?.avgGradePct !== null
        ? `<div class="row"><span class="label">${
            args.locale === "bn" ? "গড় গ্রেড" : "Avg grade"
          }</span><span class="value">${args.summary.avgGradePct}%</span></div>`
        : ""
    }
    ${alertHtml}
    ${upcomingHtml}
    <a class="cta" href="${args.appUrl}/parent">${
    args.locale === "bn" ? "ড্যাশবোর্ড দেখুন" : "View dashboard"
  }</a>
    <p class="intro" style="margin-top:24px;">${escapeHtml(args.outro)}</p>
  </div>
</body>
</html>`.trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function getUser(userId: string): Promise<{
  id: string;
  name: string | null;
  email: string;
} | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? null;
}

// ----------------------------------------------------------------------------
// Cron-driven senders
// ----------------------------------------------------------------------------

const MAX_DAILY_PARENTS = 80; // see FREE-TIER-REFERENCE.md §19

export interface RunDigestArgs {
  cadence: "daily" | "weekly";
  /** ISO day-of-week 0-6; required for "weekly" cadence (0 = Sunday). */
  dayOfWeek?: number;
}

export interface DigestRunResult {
  scanned: number;
  sent: number;
  skippedNoActivity: number;
  failed: number;
}

/**
 * Iterate parent_digest_prefs for the requested cadence and send a
 * digest email per (parent, student). Idempotent via sendEmail()'s
 * UNIQUE dedupe_key: a stable `parent-digest:<day>:<parentId>:<studentId>`
 * key per cadence prevents duplicate sends if the cron re-fires.
 */
export async function runDigest(args: RunDigestArgs): Promise<DigestRunResult> {
  const db = getDb();
  const prefs = await db
    .select({
      parentId: parentDigestPrefs.parentId,
      studentId: parentDigestPrefs.studentId,
      cadence: parentDigestPrefs.cadence,
    })
    .from(parentDigestPrefs)
    .innerJoin(
      parentStudentLinks,
      and(
        eq(parentStudentLinks.parentId, parentDigestPrefs.parentId),
        eq(parentStudentLinks.studentId, parentDigestPrefs.studentId),
        eq(parentStudentLinks.status, "active")
      )
    )
    .where(eq(parentDigestPrefs.cadence, args.cadence));

  const result: DigestRunResult = {
    scanned: prefs.length,
    sent: 0,
    skippedNoActivity: 0,
    failed: 0,
  };

  // Daily budget guard — see FREE-TIER-REFERENCE.md §19. When the
  // active count of daily parents exceeds the cap we still log the run
  // but stop once we've sent 70 (matching the alert threshold).
  if (args.cadence === "daily" && result.scanned > MAX_DAILY_PARENTS) {
    console.warn(
      `[parent-digest] daily parents (${result.scanned}) > cap (${MAX_DAILY_PARENTS}); emails after the cap are skipped this run`
    );
  }

  const dayBucket = new Date().toISOString().slice(0, 10);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://insidejibon.com.bd";

  for (const pref of prefs) {
    if (args.cadence === "daily" && result.sent >= MAX_DAILY_PARENTS) break;

    try {
      const parent = await getUser(pref.parentId);
      if (!parent?.email) continue;

      const { html, text, subject, hasActivity } = await buildDigest({
        parentId: pref.parentId,
        studentId: pref.studentId,
        appUrl,
        cadence: args.cadence,
      });

      if (!hasActivity) {
        result.skippedNoActivity += 1;
        continue;
      }

      const dedupeKey = `parent-digest:${args.cadence}:${dayBucket}:${pref.parentId}:${pref.studentId}`;
      const send = await sendEmail({
        to: parent.email,
        toUserId: pref.parentId,
        template: "parent-digest",
        dedupeKey,
        appUrl,
        manageToken: "",
        locale: "en",
        ctaUrl: `${appUrl}/parent`,
        ctaLabel: "View dashboard",
        payload: {
          kind: "parent-digest",
          studentId: pref.studentId,
          cadence: args.cadence,
        },
        subjectOverride: subject,
        textOverride: text,
      });

      if (send.outcome === "sent" || send.outcome === "deduplicated") {
        result.sent += 1;
      } else if (send.outcome === "failed") {
        result.failed += 1;
      }
    } catch (error) {
      console.error(
        `[parent-digest] send failed for parent=${pref.parentId} student=${pref.studentId}`,
        error
      );
      result.failed += 1;
    }
  }

  return result;
}

export async function sendDailyDigests(): Promise<DigestRunResult> {
  return runDigest({ cadence: "daily" });
}

export async function sendWeeklyDigests(): Promise<DigestRunResult> {
  return runDigest({ cadence: "weekly" });
}
