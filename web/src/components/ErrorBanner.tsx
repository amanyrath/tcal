interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 flex items-center justify-between gap-4">
      <span className="text-sm">{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="text-sm font-medium text-red-700 hover:text-red-900 shrink-0"
      >
        Retry
      </button>
    </div>
  );
}
