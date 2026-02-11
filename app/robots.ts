import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/montree',
          '/montree/try',
          '/montree/login',
          '/montree/login-select',
          '/montree/parent/login',
        ],
        disallow: [
          '/admin/',
          '/api/',
          '/montree/dashboard/',
          '/montree/parent/dashboard/',
          '/montree/admin/',
          '/montree/super-admin/',
          '/story/',
        ],
      },
    ],
    sitemap: 'https://montree.xyz/sitemap.xml',
  };
}
