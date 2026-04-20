// Retry helper for database writes that can hit transient platform errors.
//
// The MindStudio platform uses Redis for schema versioning, and that layer
// occasionally fails briefly with errors like:
//
//   [db] {"code":"query_error","message":"Failed to bump database version in Redis"}
//
// These are infrastructure hiccups, not bugs in our code, and they typically
// resolve within a second or two. Without retry, an AI critique that took
// 25 seconds to generate would get thrown away because of a 1-second Redis
// blip on the final save. With retry, we silently absorb the blip and the
// user gets the result they expected.
//
// Used for the final Articles.update() call in high-cost methods where
// losing the result would mean redoing expensive AI work.

// Errors we'll retry. We're conservative: only known transient platform
// failures, never our own logic errors. If we don't recognize the error,
// we surface it immediately so we don't paper over real bugs.
const RETRYABLE_ERROR_PATTERNS = [
  /Failed to bump database version in Redis/i,
  /query_error/i,
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /socket hang up/i,
  /network error/i,
  /503|502|504/,  // common transient HTTP status codes
];

function isRetryable(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return RETRYABLE_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

interface RetryOptions {
  // How many TOTAL attempts to make (including the first). Default 3.
  attempts?: number;
  // Base delay in ms between attempts. Doubles each retry. Default 500ms.
  baseDelayMs?: number;
  // Friendly label for log messages so we can trace which call retried.
  label?: string;
}

// Run a function with retry on transient platform errors. The function is
// awaited each time and its result returned on the first success. If all
// attempts fail with retryable errors, the last error is thrown. If a
// non-retryable error occurs, it is thrown immediately without retry.
//
// The function is typed as PromiseLike rather than Promise so it accepts
// the SDK's Mutation<T> and Query<T> types, which are awaitable but not
// strictly Promise instances.
export async function withDbRetry<T>(
  fn: () => PromiseLike<T>,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseDelay = options.baseDelayMs ?? 500;
  const label = options.label || 'db-call';

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Surface non-retryable errors immediately. This includes our own
      // validation errors, auth errors, and anything we don't recognize as
      // a platform issue.
      if (!isRetryable(err)) {
        throw err;
      }

      // Last attempt — surface the error
      if (attempt === attempts) {
        const friendlyMessage = makeUserFriendlyMessage(err);
        const wrapped = new Error(friendlyMessage);
        // Preserve the original error chain for debugging
        (wrapped as any).cause = err;
        (wrapped as any).originalMessage = err instanceof Error ? err.message : String(err);
        throw wrapped;
      }

      // Otherwise: log and back off before retrying
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`[${label}] attempt ${attempt} failed with retryable error, retrying in ${delay}ms:`, err instanceof Error ? err.message : err);
      await sleep(delay);
    }
  }

  // Defensive — we'd hit the throw above, but TypeScript doesn't know that
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Convert a raw platform error message into something a non-technical user
// can act on. They don't need to know about Redis. They need to know whether
// to wait and try again or escalate.
function makeUserFriendlyMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  if (/Failed to bump database version in Redis|query_error/i.test(raw)) {
    return 'The platform was briefly unavailable while saving. Your work was not lost — just try again in a moment.';
  }

  if (/ECONNRESET|ETIMEDOUT|socket hang up|network error/i.test(raw)) {
    return 'A temporary network error interrupted the save. Try again in a moment.';
  }

  if (/503|502|504/.test(raw)) {
    return 'The platform returned a temporary server error. Try again in a moment.';
  }

  // Generic fallback for unrecognized retryable errors
  return 'A temporary platform error interrupted the save. Try again in a moment.';
}
