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
          '/home',
          '/home/login',
          '/home/register',
        ],
        disallow: [
          '/admin/',
          '/api/',
          '/montree/dashboard/',
          '/montree/parent/dashboard/',
          '/montree/admin/',
          '/montree/super-admin/',
          '/home/dashboard/',
          '/home/settings/',
          '/story/',
        ],
      },
    ],
    sitemap: 'https://montree.xyz/sitemap.xml',
  };
}
