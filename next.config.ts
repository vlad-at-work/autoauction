import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

if (process.env.NODE_ENV === 'development') {
  nextConfig.turbopack = { root: __dirname };
}

export default nextConfig;
