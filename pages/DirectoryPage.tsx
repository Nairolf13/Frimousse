import { useEffect, useState, useCallback } from 'react';
import SEO from '../components/SEO';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { useI18n } from '../src/lib/useI18n';

const API_URL = import.meta.env.VITE_API_URL || '';

type Center = {
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
};

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse flex flex-col gap-3">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
      <div className="h-3 bg-gray-100 rounded w-full" />
      <div className="h-3 bg-gray-100 rounded w-2/3" />
      <div className="flex gap-2 mt-2">
        <div className="h-8 bg-gray-200 rounded-full w-24" />
        <div className="h-8 bg-gray-100 rounded-full w-20" />
      </div>
    </div>
  );
}

function CenterCard({ center }: { center: Center }) {
  const { t } = useI18n();

  const addressLine = [center.city, center.country].filter(Boolean).join(', ') || null;
  const countryLine = null;

  const initials = center.name
    .split(' ')
    .filter(w => w.length > 2)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || center.name.slice(0, 2).toUpperCase();

  return (
    <article
      className="group bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4 hover:border-[#0b5566]/30 hover:shadow-lg transition-all duration-200"
      itemScope
      itemType="https://schema.org/ChildCare"
    >
      {/* Header carte : initiales + nom */}
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #0b5566 0%, #08a7c4 100%)' }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-gray-900 leading-tight truncate" itemProp="name">
            {center.name}
          </h2>
          {center.region && (
            <span className="inline-block mt-1 text-xs font-medium text-[#0b5566] bg-[#e6f4f7] px-2 py-0.5 rounded-full">
              {center.region}
            </span>
          )}
        </div>
      </div>

      {/* Adresse */}
      <div className="flex flex-col gap-1.5 text-sm text-gray-500" itemProp="address">
        {addressLine ? (
          <span className="flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{addressLine}</span>
          </span>
        ) : (
          <span className="text-gray-300 italic text-xs">{t('directory.no_address', 'Adresse non renseignée')}</span>
        )}
      </div>

      {/* Séparateur */}
      <div className="border-t border-gray-50" />

      {/* Actions + Réseaux sociaux sur la même ligne */}
      <div className="flex items-center justify-between gap-2 mt-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          {center.phone ? (
            <a
              href={`tel:${center.phone}`}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg !text-white text-xs font-semibold transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #0b5566 0%, #08323a 100%)' }}
              itemProp="telephone"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {t('directory.call', 'Appeler')}
            </a>
          ) : (
            <span className="text-xs text-gray-300 italic">{t('directory.no_phone', 'Tél. non renseigné')}</span>
          )}

          {center.email && (
            <a
              href={`mailto:${center.email}`}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#0b5566]/30 text-[#0b5566] text-xs font-semibold hover:bg-[#e6f4f7] transition-colors"
              itemProp="email"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {t('directory.email', 'Email')}
            </a>
          )}
        </div>

        {(center.facebookUrl || center.instagramUrl || center.linkedinUrl || center.twitterUrl) && (
          <div className="flex gap-1 shrink-0">
            {center.facebookUrl && (
              <a href={center.facebookUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#1877f2]/10 text-[#1877f2] hover:bg-[#1877f2]/20 transition-colors" aria-label="Facebook">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
            )}
            {center.instagramUrl && (
              <a href={center.instagramUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#e1306c]/10 text-[#e1306c] hover:bg-[#e1306c]/20 transition-colors" aria-label="Instagram">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
            )}
            {center.linkedinUrl && (
              <a href={center.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#0a66c2]/10 text-[#0a66c2] hover:bg-[#0a66c2]/20 transition-colors" aria-label="LinkedIn">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            )}
            {center.twitterUrl && (
              <a href={center.twitterUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors" aria-label="X (Twitter)">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function DirectoryJsonLd({ centers }: { centers: Center[] }) {
  const items = centers.map((c, i) => ({
    '@type': 'ChildCare',
    position: i + 1,
    name: c.name,
    ...(c.phone ? { telephone: c.phone } : {}),
    ...(c.email ? { email: c.email } : {}),
    ...(c.address || c.city ? {
      address: {
        '@type': 'PostalAddress',
        ...(c.address ? { streetAddress: c.address } : {}),
        ...(c.postalCode ? { postalCode: c.postalCode } : {}),
        ...(c.city ? { addressLocality: c.city } : {}),
        ...(c.region ? { addressRegion: c.region } : {}),
        ...(c.country ? { addressCountry: c.country } : {}),
      }
    } : {}),
  }));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Annuaire des crèches, MAM et micro-crèches',
        description: 'Trouvez une structure d\'accueil pour enfants près de chez vous : crèches, MAM, micro-crèches et garderies.',
        numberOfItems: centers.length,
        itemListElement: items,
      }) }}
    />
  );
}

export default function DirectoryPage() {
  const { t } = useI18n();

  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameFilter, setNameFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [allRegions, setAllRegions] = useState<string[]>([]);

  const fetchCenters = useCallback(async (name: string, region: string, city: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (name) params.set('name', name);
      if (region) params.set('region', region);
      if (city) params.set('city', city);
      const res = await fetch(`${API_URL}/centers/public${params.toString() ? '?' + params.toString() : ''}`);
      if (!res.ok) throw new Error('fetch failed');
      const data: Center[] = await res.json();
      setCenters(data);
      if (!name && !region && !city) {
        setAllRegions(Array.from(new Set(data.map(c => c.region).filter(Boolean) as string[])).sort());
      }
    } catch {
      setCenters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCenters('', '', ''); }, [fetchCenters]);

  useEffect(() => {
    const t = setTimeout(() => fetchCenters(nameFilter, regionFilter, cityFilter), 300);
    return () => clearTimeout(t);
  }, [nameFilter, regionFilter, cityFilter, fetchCenters]);

  const count = centers.length;
  const plural = count > 1 ? 's' : '';
  const resultsLabel = t('directory.results', '{count} structure{s} trouvée{s}')
    .replace('{count}', String(count))
    .replace(/\{s\}/g, plural);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f8fafc' }}>
      <SEO
        title={t('directory.seo.title', 'Annuaire des crèches, MAM et micro-crèches — Frimousse')}
        description={t('directory.seo.description', 'Trouvez une crèche, MAM ou micro-crèche près de chez vous. Coordonnées, adresses et contacts des structures référencées sur Frimousse.')}
        url="https://lesfrimousses.com/annuaire"
        image="https://lesfrimousses.com/imgs/og-banner.png"
        breadcrumbs={[{ name: 'Accueil', url: 'https://lesfrimousses.com/' }, { name: 'Annuaire', url: 'https://lesfrimousses.com/annuaire' }]}
      />
      {!loading && centers.length > 0 && <DirectoryJsonLd centers={centers} />}
      <PublicNavbar variant="light" />

      {/* Hero */}
      <div className="pt-24 pb-12 px-4" style={{ background: 'linear-gradient(135deg, #0b5566 0%, #08323a 100%)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full mb-5 border border-white/20">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            {t('directory.badge', 'Structures référencées')}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
            {t('directory.title', 'Annuaire des structures d\'accueil')}
          </h1>
          <p className="text-white/70 text-base sm:text-lg max-w-xl mx-auto mb-7">
            {t('directory.subtitle', 'Crèches, MAM, micro-crèches et garderies. Trouvez la structure idéale et contactez-la directement.')}
          </p>

          {/* Barre de recherche principale */}
          <div className="bg-white rounded-2xl shadow-xl p-3 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="text"
                value={nameFilter}
                onChange={e => setNameFilter(e.target.value)}
                placeholder={t('directory.search_placeholder', 'Nom de la structure...')}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 bg-gray-50 border border-gray-100"
              />
            </div>
            <input
              type="text"
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              placeholder={t('directory.filter.city', 'Ville...')}
              className="sm:w-36 px-3 py-2.5 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 bg-gray-50 border border-gray-100"
            />
            <select
              value={regionFilter}
              onChange={e => setRegionFilter(e.target.value)}
              className="sm:w-44 px-3 py-2.5 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0b5566]/30 bg-gray-50 border border-gray-100"
            >
              <option value="">{t('directory.filter.region', 'Toutes les régions')}</option>
              {allRegions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

        </div>
      </div>

      <main className="flex-1 px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto">

          {/* Compteur */}
          {!loading && (
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-gray-500">{resultsLabel}</p>
            </div>
          )}

          {/* Grille */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : centers.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e6f4f7, #f0fafb)' }}>
                <svg className="w-8 h-8 text-[#0b5566]/40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">{t('directory.empty', 'Aucune structure trouvée')}</p>
              <p className="text-gray-400 text-sm mt-1">{t('directory.empty.hint', 'Essayez d\'élargir vos critères de recherche')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {centers.map((center, i) => <CenterCard key={i} center={center} />)}
            </div>
          )}

          {/* CTA inscription */}
          <div className="mt-16 rounded-2xl overflow-hidden flex flex-col sm:flex-row" style={{ background: 'linear-gradient(135deg, #0b5566 0%, #08323a 100%)' }}>
            <div className="flex-1 p-8">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">Vous êtes gérant ?</p>
              <h2 className="text-xl font-bold text-white mb-2">
                {t('directory.cta.title', 'Votre structure n\'apparaît pas encore ?')}
              </h2>
              <p className="text-white/70 text-sm leading-relaxed max-w-md">
                {t('directory.cta.desc', 'Les crèches, MAM et micro-crèches utilisant Frimousse peuvent apparaître dans cet annuaire depuis leurs paramètres. Gratuit et sans engagement.')}
              </p>
              <a
                href="/register"
                className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-white !text-[#0b5566] text-sm font-bold hover:bg-gray-50 transition-colors"
              >
                {t('directory.cta.action', 'Inscrire ma structure')}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
            <div className="hidden sm:flex items-center justify-center px-10 opacity-10">
              <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            </div>
          </div>

          <p className="mt-6 text-xs text-gray-400 text-center">
            {t('directory.note.show_in_directory', 'Une fois inscrit, vous pouvez choisir d\'apparaître ou non sur cette page depuis vos paramètres.')}
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
