import type { NextConfig } from 'next';

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@product/brand',
    '@product/client',
    '@product/contract',
  ],
  async rewrites() {
    return [
      {
        source: '/admin/:path*',
        destination: `${apiBaseUrl.replace(/\/$/, '')}/admin/:path*`,
      },
    ];
  },
};

export default nextConfig;
