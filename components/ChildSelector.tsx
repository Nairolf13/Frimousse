import React from 'react';
import { createPortal } from 'react-dom';

type Child = { id: string; name: string };

export default function ChildSelector({
  open,
  onClose,
  availableChildren,
  selectedChildIds,
  setSelectedChildIds,
  noChildSelected,
  setNoChildSelected,
  consentMap,
  title = 'Identifier',
  confirmLabel = 'Confirmer'
}: {
  open: boolean;
  onClose: () => void;
  availableChildren: Child[];
  selectedChildIds: string[];
  setSelectedChildIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  noChildSelected: boolean;
  setNoChildSelected: (v: boolean) => void;
  consentMap: Record<string, boolean>;
  title?: string;
  confirmLabel?: string;
}) {
  if (!open) return null;

  // Desktop dropdown (rendered inline) and mobile modal (portal) share the same content markup
  const content = (
    <div className="bg-white border rounded shadow-lg p-3 max-h-56 overflow-auto">
      <div className="text-sm font-semibold mb-2">{title}</div>
      {availableChildren.length === 0 ? (
        <div className="text-sm text-gray-500">Aucun enfant disponible</div>
      ) : (
        <div className="grid gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={noChildSelected} onChange={(e) => {
              if (e.target.checked) {
                setNoChildSelected(true);
                setSelectedChildIds([]);
              } else setNoChildSelected(false);
            }} />
            <span className="font-medium">Pas d'enfant</span>
          </label>
          {availableChildren.map(c => {
            const allowed = consentMap[c.id] ?? false;
            const checked = selectedChildIds.includes(c.id);
            return (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={checked} onChange={(e) => {
                  if (e.target.checked) {
                    setNoChildSelected(false);
                    setSelectedChildIds(prev => [...prev, c.id]);
                  } else setSelectedChildIds(prev => prev.filter(id => id !== c.id));
                }} disabled={noChildSelected} />
                <span className="truncate">{c.name}</span>
                {!allowed && <span className="text-xs text-red-500 ml-2">(pas d'autorisation)</span>}
              </label>
            );
          })}
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <button onClick={onClose} className="px-3 py-1 bg-gray-100 rounded text-sm">{confirmLabel}</button>
      </div>
    </div>
  );

  // Inline dropdown for desktop (parent should position it with absolute); render as portal modal for mobile
  return (
    <>
      {/* Desktop dropdown: parent container should place this where desired */}
      <div className="hidden sm:block absolute z-40 mt-2 w-64" aria-hidden>
        {content}
      </div>

      {/* Mobile modal via portal to body to avoid positioning issues */}
      {typeof document !== 'undefined' ? createPortal(
        <div className="sm:hidden fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="mx-4 w-full max-w-md bg-white rounded-xl p-4 max-h-[90vh] overflow-auto shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">{title}</div>
              <button onClick={onClose} className="text-gray-600">✕</button>
            </div>
            {content}
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
