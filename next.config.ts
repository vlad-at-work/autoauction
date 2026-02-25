import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Prevent Next from inferring the workspace root from lockfiles outside this repo
  // (e.g. a stray ~/package-lock.json), which can break output file tracing.
  outputFileTracingRoot: __dirname,
};

if (process.env.NODE_ENV === 'development') {
  nextConfig.turbopack = { root: __dirname };
}

export default nextConfig;
