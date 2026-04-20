// Translate technical error messages into something a non-technical user
// can act on. The backend retry helper (dist/methods/src/common/retry.ts)
// already produces friendly messages for transient platform errors when
// it gives up after retries — but errors that DON'T go through retry
// (frontend network errors, raw HTTP 500s without a body, etc.) need
// translation here.

export function friendlyErrorMessage(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
      ? err
      : 'Something went wrong.';

  // Backend retry already produced a friendly message — pass through
  if (
    raw.includes('platform was briefly unavailable') ||
    raw.includes('temporary network error') ||
    raw.includes('temporary platform error') ||
    raw.includes('temporary server error')
  ) {
    return raw;
  }

  // Raw HTTP status messages from the SDK
  if (/Method ".+" failed: 5\d\d/i.test(raw) || /\b50\d\b/.test(raw)) {
    return 'The platform was briefly unavailable. Your work is safe — try again in a moment.';
  }
  if (/Method ".+" failed: 429/i.test(raw)) {
    return 'Too many requests right now. Wait 30 seconds and try again.';
  }
  if (/Method ".+" failed: 4\d\d/i.test(raw)) {
    return 'Request was rejected. Try again, or refresh the page if it keeps happening.';
  }

  // Network-layer failures
  if (/Failed to fetch|NetworkError|Network request failed/i.test(raw)) {
    return 'Could not reach the server. Check your connection and try again.';
  }
  if (/timeout|timed out/i.test(raw)) {
    return 'The request took too long. Try again — the server may be busy.';
  }

  // Otherwise pass through whatever the backend gave us, on the assumption
  // that it's a real, actionable message (e.g., validation errors)
  return raw;
}
