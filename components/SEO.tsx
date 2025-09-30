
import { Helmet } from 'react-helmet-async';
import type { ReactElement } from 'react';
import { buildJsonLd } from './buildJsonLd';
import { SITE_URL, SITE_NAME } from '../src/config/site';

type Hreflang = { lang: string; url: string };
type Breadcrumb = { name: string; url: string };

/** Generic JSON-LD object shape (shallow) */
type JsonLdObject = Record<string, unknown>;

export type SEOProps = {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  locale?: string; // ex: 'fr_FR'
  twitterHandle?: string; // ex: '@frimousse'
  noindex?: boolean;
  type?: 'website' | 'article' | 'event';
  author?: string | string[];
  publishedAt?: string; // ISO date
  modifiedAt?: string; // ISO date
  tags?: string[];
  languages?: Hreflang[]; // hreflang
  breadcrumbs?: Breadcrumb[];
  ldJson?: JsonLdObject | JsonLdObject[]; // additional structured data
};
function makeAbsoluteUrl(u?: string): string | undefined {
  if (!u) return undefined;
  try {
    const parsed = new URL(u);
    return parsed.toString();
  } catch {
    const path = u.startsWith('/') ? u : `/${u}`;
    return `${SITE_URL}${path}`;
  }
}

export default function SEO({
  title,
  description,
  url,
  image,
  locale = 'fr_FR',
  twitterHandle = '@lesfrimousses',
  noindex = false,
  type = 'website',
  author,
  publishedAt,
  modifiedAt,
  tags = [],
  languages = [],
  breadcrumbs = [],
  ldJson,
}: SEOProps): ReactElement {
  const resolvedUrl = makeAbsoluteUrl(url);
  const canonical = resolvedUrl ?? (typeof window !== 'undefined' ? window.location.href : SITE_URL + '/');
  const absImage = makeAbsoluteUrl(image);

  const finalLd = buildJsonLd({
    title,
    description,
    url: canonical,
    image: absImage ?? image,
    type,
    author,
    publishedAt,
    modifiedAt,
    tags,
    breadcrumbs,
    ldJson,
  });

  return (
    <Helmet>
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      <meta name="robots" content={noindex ? 'noindex,nofollow' : 'index,follow'} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      {author && <meta name="author" content={Array.isArray(author) ? author.join(', ') : author} />}
      <meta name="theme-color" content="#0b5566" />

      <meta property="og:locale" content={locale} />
      <meta property="og:type" content={type} />
      {title && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      {canonical && <meta property="og:url" content={canonical} />}
      <meta property="og:site_name" content={SITE_NAME} />
      {absImage && <meta property="og:image" content={absImage} />}
      {absImage && <meta property="og:image:alt" content={description ?? title} />}
      {absImage && <meta property="og:image:width" content="1200" />}
      {absImage && <meta property="og:image:height" content="630" />}

      <meta name="twitter:card" content={absImage ? 'summary_large_image' : 'summary'} />
      {twitterHandle && <meta name="twitter:site" content={twitterHandle} />}
      {twitterHandle && <meta name="twitter:creator" content={twitterHandle} />}
      {absImage && <meta name="twitter:image" content={absImage} />}
      {absImage && <meta name="twitter:image:alt" content={description ?? title} />}

      {canonical && <link rel="canonical" href={canonical} />}

      {languages.map(l => (
        <link key={l.lang} rel="alternate" hrefLang={l.lang} href={makeAbsoluteUrl(l.url) ?? l.url} />
      ))}

      {finalLd.length > 0 && (
        <script type="application/ld+json">{JSON.stringify(finalLd)}</script>
      )}
    </Helmet>
  );
}

// helper implemented in components/buildJsonLd.ts

