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

  const hasConsentInfo = consentMap && Object.keys(consentMap).length > 0;

  const isAllowedValue = (v: unknown) => v === true || v === 'true' || v === 1 || v === '1';

  // no debug logs

  // Split the modal into header / scrollable body / footer so the confirm button stays visible
  const body = (
    <div>
      {/* When consentMap isn't ready we show empty badge placeholders rather than a loading line to avoid layout shifts */}
      {availableChildren.length === 0 ? (
        <div className="text-sm text-gray-500">Aucun enfant disponible</div>
      ) : (
        <div className="space-y-2">
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
            const allowedRaw = consentMap ? consentMap[c.id] : undefined;
            const allowed = isAllowedValue(allowedRaw);
            const checked = selectedChildIds.includes(c.id);
            return (
              <label key={c.id} className="flex items-center justify-between text-sm p-1 rounded border">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <input type="checkbox" checked={checked} onChange={(e) => {
                    if (e.target.checked) {
                      setNoChildSelected(false);
                      setSelectedChildIds(prev => [...prev, c.id]);
                    } else setSelectedChildIds(prev => prev.filter(id => id !== c.id));
                  }} disabled={noChildSelected} />
                  <span className="truncate">{c.name}</span>
                </div>
                <div className="w-40 text-right">
                  {hasConsentInfo ? (
                    !allowed ? <span className="text-xs text-red-500">(pas d'autorisation)</span> : <span className="text-xs text-green-600">(autorisation)</span>
                  ) : (
                    <span className="text-xs text-gray-400">&nbsp;</span>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );

  const footer = (
    <div className="p-2 bg-white border-t flex justify-end">
      <button onClick={onClose} className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-3 sm:py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 text-sm w-full sm:w-auto shadow-sm">{confirmLabel}</button>
    </div>
  );

  // Inline dropdown for desktop (parent should position it with absolute); render as portal modal for mobile
  return (
    <>
      {/* Desktop dropdown: parent container should place this where desired */}
      <div className="hidden sm:block absolute z-40 mt-2 w-96" aria-hidden>
        <div className="bg-white border rounded shadow-lg p-0 max-h-56 w-96 flex flex-col">
          <div className="p-3 border-b">
            <div className="text-sm font-semibold">{title}</div>
          </div>
          <div className="p-3 overflow-auto flex-1">{body}</div>
          {footer}
        </div>
      </div>

      {/* Mobile modal via portal to body to avoid positioning issues */}
      {typeof document !== 'undefined' ? createPortal(
        <div className="sm:hidden fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="mx-4 w-full max-w-md bg-white rounded-xl p-0 max-h-[90vh] overflow-hidden shadow-lg">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="text-lg font-semibold">{title}</div>
              <button onClick={onClose} className="text-gray-600" aria-label="Fermer">×</button>
            </div>
            <div className="p-4 overflow-auto max-h-[70vh]">{body}</div>
            {footer}
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
