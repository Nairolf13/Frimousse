// Self-contained helpers and types for building JSON-LD
type Hreflang = { lang: string; url: string };
type Breadcrumb = { name: string; url: string };
type JsonLdObject = Record<string, unknown>;

export type SEOProps = {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  locale?: string;
  twitterHandle?: string;
  noindex?: boolean;
  type?: 'website' | 'article' | 'event';
  author?: string | string[];
  publishedAt?: string;
  modifiedAt?: string;
  tags?: string[];
  languages?: Hreflang[];
  breadcrumbs?: Breadcrumb[];
  ldJson?: JsonLdObject | JsonLdObject[];
};

import { SITE_URL, SITE_NAME } from '../src/config/site';

function cleanObject<T extends JsonLdObject>(obj: T): T {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
  return Object.fromEntries(entries) as T;
}

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

export function buildJsonLd(props: Partial<SEOProps> & { url?: string }): JsonLdObject[] {
  const {
    title,
    description,
    url,
    image,
    type = 'website',
    author,
    publishedAt,
    modifiedAt,
    tags = [],
    breadcrumbs = [],
    ldJson,
  } = props;

  const canonical = url ?? SITE_URL + '/';
  const jsonLD: JsonLdObject[] = [];

  // Organization/WebSite structured data is provided in index.html as the canonical source
  // buildJsonLd only returns page-level structured data (Article, Event, BreadcrumbList)

  // Article
  if (type === 'article') {
    // Normalize author to an array of Person objects
    const authorsArr = author
      ? Array.isArray(author)
        ? author
        : [author]
      : [];

    const authorObjects = authorsArr.length
      ? authorsArr.map(a => ({ '@type': 'Person', name: a }))
      : undefined;

    jsonLD.push(
      cleanObject({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description,
        author: authorObjects,
        datePublished: publishedAt,
        dateModified: modifiedAt ?? publishedAt,
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        image: image ? [{ '@type': 'ImageObject', url: makeAbsoluteUrl(image), width: 1200, height: 630 }] : undefined,
        keywords: tags.length ? tags.join(', ') : undefined,
      })
    );
  }

  // Event
  if (type === 'event') {
    jsonLD.push(
      cleanObject({
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: title,
        description,
        startDate: publishedAt,
        endDate: modifiedAt,
        url: canonical,
        location: {
          '@type': 'Place',
          name: SITE_NAME,
          address: 'Marseille, France',
        },
        image: image ? [{ '@type': 'ImageObject', url: makeAbsoluteUrl(image), width: 1200, height: 630 }] : undefined,
      })
    );
  }

  // Breadcrumbs
  if (breadcrumbs.length) {
    jsonLD.push(
      cleanObject({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((bc, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: bc.name,
          item: bc.url,
        })),
      })
    );
  }

  // Merge additional ldJson if provided
  const extraLd: JsonLdObject[] = [];
  if (ldJson) {
    if (Array.isArray(ldJson)) extraLd.push(...ldJson.map(i => cleanObject(i as JsonLdObject)));
    else extraLd.push(cleanObject(ldJson as JsonLdObject));
  }

  return [...jsonLD, ...extraLd];
}
