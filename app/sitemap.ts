import type { MetadataRoute } from 'next'

const PUBLIC_ROUTES = [
  '',
  '/v1',
  '/v2',
  '/v3',
  '/v4',
  '/v5',
  '/v6',
  '/v7',
  '/v8',
  '/v9',
  '/v10',
  '/v11',
  '/v12',
  '/v13',
  '/v14',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://frequencycaps.vercel.app'

  return PUBLIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '' ? 1 : 0.6,
  }))
}
