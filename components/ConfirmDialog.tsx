export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  variant = 'default'
}: {
  open: boolean;
  title?: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  loading?: boolean;
  variant?: 'default' | 'success' | 'danger';
}) {
  if (!open) return null;

  const icon = variant === 'success' ? (
    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600">
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  ) : variant === 'danger' ? (
    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600">
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M12 9v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  ) : (
    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600">
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M12 5v7l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white w-full max-w-md mx-4 rounded-lg shadow-2xl p-6 transform transition-all duration-200 ease-out scale-100">
        <div className="flex items-start gap-4">
          {icon}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {body && <div className="text-sm text-gray-600 mt-2">{body}</div>}
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          {cancelLabel ? (
            <button onClick={onCancel} disabled={loading} className="px-4 py-2 bg-gray-50 text-gray-700 rounded-md border border-gray-200 hover:bg-gray-100">
              {cancelLabel}
            </button>
          ) : null}
          <button
            onClick={async () => { await onConfirm(); }}
            disabled={loading}
            className={`px-4 py-2 rounded-md shadow text-white font-medium ${variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : variant === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
