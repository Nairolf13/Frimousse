import { useEffect, useState, useCallback } from 'react';
import SEO from '../components/SEO';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { useI18n } from '../src/lib/useI18n';

const API_URL = import.meta.env.VITE_API_URL || '';

type Center = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  region: string | null;
  country: string | null;
};

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow border border-gray-100 p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
      <div className="h-4 bg-gray-100 rounded w-full mb-2" />
      <div className="h-4 bg-gray-100 rounded w-1/2 mb-4" />
      <div className="h-8 bg-gray-100 rounded w-1/3" />
    </div>
  );
}

function CenterCard({ center }: { center: Center }) {
  const { t } = useI18n();

  const addressLine = [center.city, center.country].filter(Boolean).join(', ') || null;

  return (
    <div className="bg-white rounded-2xl shadow border border-gray-100 p-6 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <h2 className="text-lg font-bold text-gray-900 leading-tight">{center.name}</h2>

      {addressLine ? (
        <p className="text-sm text-gray-600 flex items-start gap-1.5">
          <svg className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {addressLine}
        </p>
      ) : (
        <p className="text-sm text-gray-400 italic">{t('directory.no_address', 'Adresse non renseignée')}</p>
      )}

      {center.region && (
        <span className="inline-block self-start bg-brand-50 text-brand-700 text-xs font-semibold px-3 py-1 rounded-full border border-brand-100">
          {center.region}
        </span>
      )}

      <div className="mt-auto pt-2">
        {center.phone ? (
          <a
            href={`tel:${center.phone}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500 !text-white text-sm font-semibold hover:bg-brand-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {t('directory.call', 'Appeler')}
          </a>
        ) : (
          <p className="text-sm text-gray-400 italic">{t('directory.no_phone', 'Numéro non renseigné')}</p>
        )}
      </div>
    </div>
  );
}

export default function DirectoryPage() {
  const { t } = useI18n();

  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);

  const [nameFilter, setNameFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  // Derived unique regions from all loaded data (before client-side filtering)
  const [allRegions, setAllRegions] = useState<string[]>([]);

  const fetchCenters = useCallback(async (name: string, region: string, city: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (name) params.set('name', name);
      if (region) params.set('region', region);
      if (city) params.set('city', city);
      const url = `${API_URL}/centers/public${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('fetch failed');
      const data: Center[] = await res.json();
      setCenters(data);
      // Populate regions from unfiltered data only on initial load
      if (!name && !region && !city) {
        const regions = Array.from(new Set(data.map(c => c.region).filter(Boolean) as string[])).sort();
        setAllRegions(regions);
      }
    } catch {
      setCenters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + region population
  useEffect(() => {
    fetchCenters('', '', '');
  }, [fetchCenters]);

  // Debounced re-fetch when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCenters(nameFilter, regionFilter, cityFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [nameFilter, regionFilter, cityFilter, fetchCenters]);

  const count = centers.length;
  const plural = count > 1 ? 's' : '';
  const resultsLabel = t('directory.results', '{count} structure{s} trouvée{s}')
    .replace('{count}', String(count))
    .replace(/\{s\}/g, plural);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SEO
        title={t('directory.title', 'Annuaire des structures')}
        description={t('directory.description', "Trouvez une structure d'accueil près de chez vous")}
      />
      <PublicNavbar variant="light" />

      <main className="flex-1 pt-28 pb-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
              {t('directory.title', 'Annuaire des structures')}
            </h1>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              {t('directory.description', "Trouvez une structure d'accueil près de chez vous")}
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-4 mb-8 flex flex-col sm:flex-row gap-3">
            {/* Name search */}
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="text"
                value={nameFilter}
                onChange={e => setNameFilter(e.target.value)}
                placeholder={t('directory.search_placeholder', 'Rechercher une structure...')}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>

            {/* Region dropdown */}
            <select
              value={regionFilter}
              onChange={e => setRegionFilter(e.target.value)}
              className="sm:w-48 px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
            >
              <option value="">{t('directory.filter.region', 'Toutes les régions')}</option>
              {allRegions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            {/* City input */}
            <input
              type="text"
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              placeholder={t('directory.filter.city', 'Ville...')}
              className="sm:w-40 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          {/* Results count */}
          {!loading && (
            <p className="text-sm text-gray-500 mb-4">{resultsLabel}</p>
          )}

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : centers.length === 0 ? (
            <div className="text-center py-20">
              <svg className="w-16 h-16 mx-auto text-gray-200 mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-gray-400 text-lg font-medium">{t('directory.empty', 'Aucune structure trouvée')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {centers.map(center => (
                <CenterCard key={center.id} center={center} />
              ))}
            </div>
          )}

          <div className="mt-6 text-sm text-gray-500 text-center">
            <span className="font-semibold">*</span> {t('directory.note.show_in_directory', 'Une fois inscrit, vous pouvez choisir d\'apparaître ou non sur cette page.')}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
