import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Don't bundle native modules — load them at runtime instead
  serverExternalPackages: ['keytar'],
};

export default nextConfig;
