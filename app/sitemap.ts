import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/contato';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/horarios`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/privacidade`, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
