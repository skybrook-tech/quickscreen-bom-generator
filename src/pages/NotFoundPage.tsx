import { Link, useRouteError, isRouteErrorResponse } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";

interface Props {
  /** When used as a standalone 404 route (not errorElement). */
  asNotFound?: boolean;
}

export function NotFoundPage({ asNotFound }: Props) {
  // useRouteError is only valid when rendered as an errorElement
  let error: unknown;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    error = useRouteError();
  } catch {
    error = null;
  }

  const is404 =
    asNotFound ||
    (isRouteErrorResponse(error) && error.status === 404) ||
    error == null;

  const title = is404 ? "404 · Page not found" : "Something went wrong";
  const message = is404
    ? "The page you're looking for doesn't exist or has moved."
    : error instanceof Error
      ? error.message
      : isRouteErrorResponse(error)
        ? `${error.status} — ${error.statusText}`
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as any).message)
          : String(error || "An unexpected error occurred.");

  const errorStack = !is404 && error instanceof Error ? error.stack : null;

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <span className="text-sm font-black text-brand-text uppercase tracking-wider">
            Byron & Beyond Fencing
          </span>
        </div>

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-brand-card border border-brand-border flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={28} className="text-brand-muted" />
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-brand-text mb-3">{title}</h1>
        <p className="text-brand-muted text-sm mb-4">{message}</p>
        
        {errorStack && (
          <pre className="text-left bg-brand-card text-xs text-red-400 p-4 rounded border border-brand-border overflow-auto max-h-48 mb-6 font-mono whitespace-pre-wrap">
            {errorStack}
          </pre>
        )}

        {/* CTA */}
        <Link
          to="/fence-calculator"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-accent hover:bg-brand-accent-hover text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Take me to the calculator
          <ArrowRight size={15} />
        </Link>

        <p className="mt-6 text-xs text-brand-muted/60">
          If you think this is a bug, please contact your administrator.
        </p>
      </div>
    </div>
  );
}
