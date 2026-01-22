const withNextIntl = require('next-intl/plugin')('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  devIndicators: false,
  images: {
    domains: ['image.tmdb.org', 'localhost'],
  },
}

module.exports = withNextIntl(nextConfig);
