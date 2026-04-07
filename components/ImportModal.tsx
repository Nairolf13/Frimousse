import { useRef, useState } from 'react';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

type RowStatus = 'new' | 'exists';

type NannyRow = { name: string; email: string; contact?: string; experience?: string; availability?: string; birthdate?: string; _status: RowStatus };
type ParentRow = { firstname: string; lastname: string; email: string; phone?: string; _status: RowStatus };
type ChildRow = { name: string; birthdate: string; sexe?: string; group?: string; allergies?: string; email_parent1?: string; email_parent2?: string; _status: RowStatus };

type PreviewData = { nannies: NannyRow[]; parents: ParentRow[]; children: ChildRow[] };

type Report = { nannies: { created: number; skipped: number }; parents: { created: number; skipped: number }; children: { created: number; skipped: number }; errors: string[] };

type Props = { onClose: () => void; centerId?: string | null };

export default function ImportModal({ onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError(null);
    setValidationErrors([]);
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setValidationErrors([]);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetchWithRefresh(`${API_URL}/import/preview`, { method: 'POST', credentials: 'include', body: formData });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) { setValidationErrors(data.errors); return; }
        setError(data.error || 'Erreur lors de la lecture du fichier');
        return;
      }
      setPreview(data);
      setStep('preview');
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetchWithRefresh(`${API_URL}/import/confirm`, { method: 'POST', credentials: 'include', body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erreur lors de l'import"); return; }
      setReport(data.report);
      setStep('done');
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetchWithRefresh(`${API_URL}/import/template`, { credentials: 'include' });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_import_frimousse.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  const totalNew = preview ? preview.nannies.filter(r => r._status === 'new').length + preview.parents.filter(r => r._status === 'new').length + preview.children.length : 0;
  const totalExists = preview ? preview.nannies.filter(r => r._status === 'exists').length + preview.parents.filter(r => r._status === 'exists').length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border-default">
          <h2 className="text-base font-bold text-primary">Importer des données</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-secondary text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Step: upload */}
          {step === 'upload' && (
            <>
              <p className="text-sm text-secondary">
                Importez vos nounous, parents et enfants en une seule fois depuis un fichier Excel.
                Le fichier doit contenir 3 onglets : <strong>Nounous</strong>, <strong>Parents</strong>, <strong>Enfants</strong>.
              </p>
              <button type="button" onClick={handleDownloadTemplate} className="inline-flex items-center gap-2 text-sm text-accent font-medium hover:underline">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Télécharger le template Excel
              </button>

              <div
                className="border-2 border-dashed border-border-default rounded-xl p-8 text-center cursor-pointer hover:border-accent/40 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {file ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-primary">{file.name}</p>
                    <p className="text-xs text-muted">{(file.size / 1024).toFixed(1)} Ko</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <svg className="w-8 h-8 mx-auto text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0l-3 3m3-3l3 3M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1" /></svg>
                    <p className="text-sm text-secondary">Cliquez pour choisir un fichier <strong>.xlsx</strong></p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={handleFileChange} />
              </div>

              {validationErrors.length > 0 && (
                <div className="rounded-xl bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-800 p-4 space-y-1">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">Erreurs de validation :</p>
                  <ul className="text-xs text-red-600 dark:text-red-400 space-y-0.5 list-disc list-inside">
                    {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
            </>
          )}

          {/* Step: preview */}
          {step === 'preview' && preview && (
            <>
              <div className="flex items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  {totalNew} à créer
                </span>
                {totalExists > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-amber-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    {totalExists} email(s) déjà existant(s) — ignoré(s)
                  </span>
                )}
              </div>

              {preview.nannies.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Nounous ({preview.nannies.length})</h3>
                  <div className="rounded-xl border border-border-default overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-input text-muted">
                        <tr>
                          <th className="text-left px-3 py-2">name</th>
                          <th className="text-left px-3 py-2">email</th>
                          <th className="text-left px-3 py-2">experience</th>
                          <th className="text-left px-3 py-2">availability</th>
                          <th className="text-left px-3 py-2">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-default">
                        {preview.nannies.map((r, i) => (
                          <tr key={i} className={r._status === 'exists' ? 'bg-amber-50 dark:bg-amber-950/30' : ''}>
                            <td className="px-3 py-2 font-medium text-primary">{r.name}</td>
                            <td className="px-3 py-2 text-secondary">{r.email}</td>
                            <td className="px-3 py-2 text-secondary">{r.experience || '—'}</td>
                            <td className="px-3 py-2 text-secondary">{r.availability || '—'}</td>
                            <td className="px-3 py-2">
                              {r._status === 'new'
                                ? <span className="text-emerald-600 font-medium">Nouveau</span>
                                : <span className="text-amber-600 font-medium">Existe déjà</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {preview.parents.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Parents ({preview.parents.length})</h3>
                  <div className="rounded-xl border border-border-default overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-input text-muted">
                        <tr>
                          <th className="text-left px-3 py-2">firstName</th>
                          <th className="text-left px-3 py-2">lastName</th>
                          <th className="text-left px-3 py-2">email</th>
                          <th className="text-left px-3 py-2">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-default">
                        {preview.parents.map((r, i) => (
                          <tr key={i} className={r._status === 'exists' ? 'bg-amber-50 dark:bg-amber-950/30' : ''}>
                            <td className="px-3 py-2 font-medium text-primary">{r.firstname}</td>
                            <td className="px-3 py-2 text-primary">{r.lastname}</td>
                            <td className="px-3 py-2 text-secondary">{r.email}</td>
                            <td className="px-3 py-2">
                              {r._status === 'new'
                                ? <span className="text-emerald-600 font-medium">Nouveau</span>
                                : <span className="text-amber-600 font-medium">Existe déjà</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {preview.children.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Enfants ({preview.children.length})</h3>
                  <div className="rounded-xl border border-border-default overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-input text-muted">
                        <tr>
                          <th className="text-left px-3 py-2">name</th>
                          <th className="text-left px-3 py-2">birthDate</th>
                          <th className="text-left px-3 py-2">sexe</th>
                          <th className="text-left px-3 py-2">group</th>
                          <th className="text-left px-3 py-2">Parent(s)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-default">
                        {preview.children.map((r, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-medium text-primary">{r.name}</td>
                            <td className="px-3 py-2 text-secondary">{r.birthdate || '—'}</td>
                            <td className="px-3 py-2 text-secondary">{r.sexe || '—'}</td>
                            <td className="px-3 py-2 text-secondary">{r.group || '—'}</td>
                            <td className="px-3 py-2 text-secondary">{[r.email_parent1, r.email_parent2].filter(Boolean).join(', ') || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
            </>
          )}

          {/* Step: done */}
          {step === 'done' && report && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-base font-semibold text-primary">Import terminé</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Nounous', ...report.nannies },
                  { label: 'Parents', ...report.parents },
                  { label: 'Enfants', created: report.children.created, skipped: report.children.skipped },
                ].map(item => (
                  <div key={item.label} className="rounded-xl bg-input p-4 text-center">
                    <p className="text-xs text-muted mb-1">{item.label}</p>
                    <p className="text-2xl font-bold text-accent">{item.created}</p>
                    <p className="text-xs text-muted">créé(s)</p>
                    {(item.skipped ?? 0) > 0 && <p className="text-xs text-amber-500 mt-1">{item.skipped} ignoré(s)</p>}
                  </div>
                ))}
              </div>
              {report.errors.length > 0 && (
                <div className="rounded-xl bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-800 p-4 space-y-1">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">Erreurs partielles :</p>
                  <ul className="text-xs text-red-600 dark:text-red-400 space-y-0.5 list-disc list-inside">
                    {report.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-default gap-3">
          {step === 'upload' && (
            <>
              <button type="button" onClick={onClose} className="text-sm text-secondary hover:text-primary">Annuler</button>
              <button
                type="button"
                onClick={handlePreview}
                disabled={!file || loading}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {loading ? 'Analyse...' : 'Analyser le fichier'}
              </button>
            </>
          )}
          {step === 'preview' && (
            <>
              <button type="button" onClick={() => { setStep('upload'); setPreview(null); }} className="text-sm text-secondary hover:text-primary">Retour</button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading || totalNew === 0}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {loading ? 'Import en cours...' : `Importer ${totalNew} entrée(s)`}
              </button>
            </>
          )}
          {step === 'done' && (
            <button type="button" onClick={onClose} className="ml-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors">
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
