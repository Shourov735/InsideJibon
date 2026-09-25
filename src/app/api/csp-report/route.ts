import { getDb } from "@/db";
import { auditLog } from "@/db/schema/audit";

/**
 * CSP violation report endpoint. The browser POSTs a
 * `application/csp-report` JSON body whenever the
 * `Content-Security-Policy-Report-Only` policy is violated. We
 * acknowledge with 204 (the standard response code) and write to the
 * audit log so violations can be reviewed from the admin console.
 *
 * Per docs/remaster-phase-0-foundation.md §6, this endpoint must:
 *  - Always return 204, never 4xx — violation reports are best-effort
 *    telemetry and a 4xx would be ignored by some browsers, causing
 *    retry storms.
 *  - Set `Cache-Control: no-store` — reports are per-request.
 *  - Use a short body parse cap so a malicious / oversized report does
 *    not blow the Workers 10ms CPU budget.
 *
 * During R0 the policy is REPORT-ONLY, so reports are expected and
 * informational. Once R1 promotes CSP to enforced, the absence of
 * reports is the success signal.
 */
export const runtime = "nodejs";

const MAX_BODY_BYTES = 8 * 1024;

export async function POST(request: Request) {
  // Hard-cap the body so a single huge report can't spend our 10ms CPU.
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return new Response(null, { status: 204 });
  }

  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return new Response(null, { status: 204 });
    }
    raw = JSON.parse(text);
  } catch {
    // Malformed JSON — browsers occasionally send broken reports.
    return new Response(null, { status: 204 });
  }

  // Browsers send either `{ "csp-report": { ... } }` (legacy) or a flat
  // object containing `violated-directive` / `effective-directive` /
  // `blocked-uri` / `document-uri` (modern). Normalize to a stable shape.
  const report = extractReport(raw);
  if (!report) {
    return new Response(null, { status: 204 });
  }

  // Best-effort write. Failure to write must not surface as 5xx —
  // report endpoints should never fail.
  void persistAuditLog(report);

  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}

type NormalizedReport = {
  directive: string | null;
  blockedUri: string | null;
  documentUri: string | null;
  sourceFile: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
  raw: unknown;
};

function extractReport(raw: unknown): NormalizedReport | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  // Legacy shape: { "csp-report": { ... } }
  const legacy = obj["csp-report"];
  if (legacy && typeof legacy === "object") {
    return fromObject(legacy as Record<string, unknown>, legacy);
  }

  // Modern shape: top-level fields.
  return fromObject(obj, obj);
}

function fromObject(
  src: Record<string, unknown>,
  raw: unknown
): NormalizedReport {
  const get = (k: string): string | null => {
    const v = src[k];
    return typeof v === "string" && v.length > 0 ? v : null;
  };
  const num = (k: string): number | null => {
    const v = src[k];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };
  return {
    directive:
      get("effective-directive") ?? get("violated-directive") ?? null,
    blockedUri: get("blocked-uri") ?? null,
    documentUri: get("document-uri") ?? null,
    sourceFile: get("source-file") ?? null,
    lineNumber: num("line-number"),
    columnNumber: num("column-number"),
    raw,
  };
}

async function persistAuditLog(report: NormalizedReport): Promise<void> {
  try {
    const db = getDb();
    await db.insert(auditLog).values({
      actorId: null,
      action: "csp.violation",
      subjectId: null,
      metadata: {
        directive: report.directive,
        blockedUri: report.blockedUri,
        documentUri: report.documentUri,
        sourceFile: report.sourceFile,
        lineNumber: report.lineNumber,
        columnNumber: report.columnNumber,
        // Keep the raw payload bounded so a malicious blob can't bloat
        // the audit row. Audit rows are append-only JSONB.
        raw: truncateRaw(report.raw),
      },
    });
  } catch {
    // Audit-log write is best-effort. Swallow silently.
  }
}

function truncateRaw(raw: unknown): unknown {
  try {
    const json = JSON.stringify(raw);
    if (json.length <= 2 * 1024) return raw;
    return { _truncated: true, preview: json.slice(0, 2 * 1024) };
  } catch {
    return null;
  }
}

// Make sure Next.js does not statically optimize this route.
export const dynamic = "force-dynamic";
