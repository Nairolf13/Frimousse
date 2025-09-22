import React from 'react';

export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false
}: {
  open: boolean;
  title?: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  loading?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white w-full max-w-md mx-4 rounded-lg shadow-lg p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="text-sm text-gray-700 mb-5">{body}</div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} disabled={loading} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md border border-gray-200">
            {cancelLabel}
          </button>
          <button onClick={async () => { await onConfirm(); }} disabled={loading} className="px-4 py-2 bg-red-600 text-white rounded-md shadow">
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
