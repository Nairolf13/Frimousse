import { useEffect, useState } from 'react';
import { useI18n } from '../lib/useI18n';

type Detail = {
  childName: string;
  daysPresent: number;
  ratePerDay: number;
  subtotal: number;
};

type PaymentRecord = {
  id: string;
  parent: { firstName?: string; lastName?: string } | null;
  total: number;
  details: Detail[];
};

export default function PaymentHistory() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<PaymentRecord[]>([]);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(`/api/payment-history/${year}/${month}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((d) => { if (mounted) setData(d); })
      .catch((err) => { console.error('Failed to load payment history', err); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [year, month]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t('payments.history.title')}</h1>

      <div className="flex gap-2 mb-4">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="border p-2 rounded"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const name = new Date(2000, m - 1, 1).toLocaleString(locale || 'fr-FR', { month: 'long' });
            return <option key={m} value={m}>{`${m} — ${name}`}</option>;
          })}
        </select>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border p-2 rounded w-28"
        />
      </div>

      <div className="grid gap-4">
        {loading && <div>{t('loading')}</div>}
        {!loading && data.length === 0 && <div className="text-gray-500">{t('payments.history.empty')}</div>}
        {data.map((record) => (
          <div key={record.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-lg font-semibold">{record.parent ? `${record.parent.firstName || ''} ${record.parent.lastName || ''}`.trim() : t('common.none')}</h2>
                <p className="text-gray-600">{t('payments.total')}: {new Intl.NumberFormat(locale || 'fr-FR', { style: 'currency', currency: 'EUR' }).format(record.total)}</p>
              </div>
            </div>
            <div className="mt-2">
              {Array.isArray(record.details) && record.details.map((child, idx) => (
                <div key={idx} className="flex justify-between py-1 border-t last:border-b-0">
                  <span>{child.childName}</span>
                  <span>{child.daysPresent} {t('payments.days')} × {new Intl.NumberFormat(locale || 'fr-FR', { style: 'currency', currency: 'EUR' }).format(child.ratePerDay)}</span>
                  <span className="font-bold">{new Intl.NumberFormat(locale || 'fr-FR', { style: 'currency', currency: 'EUR' }).format(child.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
