/**
 * Safely extracts a human-readable message from any error shape.
 *
 * Why this exists: `JSON.stringify(new Error("some message"))` returns
 * `{}` — a native Error's `message` property isn't "enumerable", so
 * stringifying the raw error object silently throws away the message.
 * If any code path ever does that (directly, or via a library that
 * stringifies internally), the UI shows a useless "{}" with zero
 * indication of what actually went wrong. This function always checks
 * `.message` (and a couple of other common shapes) before ever falling
 * back to stringifying, so that failure mode can't happen again.
 */
export function getErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (!err) return fallback;
  if (typeof err === "string" && err.trim()) return err;
  if (err instanceof Error && err.message) return err.message;

  if (typeof err === "object") {
    const anyErr = err as Record<string, unknown>;
    const candidate = anyErr.message ?? anyErr.error_description ?? anyErr.msg ?? anyErr.error;
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }

  return fallback;
}
