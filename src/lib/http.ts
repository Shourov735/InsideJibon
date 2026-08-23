/**
 * Evaluates an `If-None-Match` request header against a stored object's ETag.
 * Tolerates the variations clients send: comma-separated lists, weak
 * validators (`W/"..."`) and quoted/unquoted forms.
 */
export function etagMatches(
  ifNoneMatch: string | null,
  etag: string | undefined
): boolean {
  if (!ifNoneMatch || !etag) return false;
  if (ifNoneMatch.trim() === "*") return true;

  const normalize = (value: string) =>
    value.trim().replace(/^W\//, "").replace(/^"+|"+$/g, "");
  const own = normalize(etag);
  return ifNoneMatch
    .split(",")
    .some((candidate) => normalize(candidate) === own);
}
