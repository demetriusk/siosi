import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Ignore Node.js modules in client-side bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // Suppress face-api.js warnings
    config.ignoreWarnings = [
      { module: /node_modules\/@vladmandic\/face-api/ },
    ];

    return config;
  },
};

export default nextConfig;
