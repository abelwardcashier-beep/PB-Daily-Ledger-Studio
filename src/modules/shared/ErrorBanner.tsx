import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

/** Inline, presentational error strip used by data-driven views. */
export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
    >
      <span className="flex items-center gap-2 min-w-0">
        <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-rose-500" />
        <span className="truncate">{message}</span>
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 font-semibold text-rose-600 hover:text-rose-700 underline underline-offset-2"
        >
          Retry
        </button>
      )}
    </div>
  );
}
