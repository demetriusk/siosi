/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    // Ignore Node.js modules in client-side bundles (face-api.js imports polyfilled modules)
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        encoding: false,
      };
    }
    return config;
  },
};

// Dynamically import the next-intl plugin if available (ESM aware)
try {
  const mod = await import('next-intl/plugin');
  const nextIntl = (mod && mod.default) ? mod.default() : mod();
  var finalConfig = nextIntl(nextConfig);
} catch (e) {
  // If the plugin isn't available, fall back to plain config
  var finalConfig = nextConfig;
}

export default finalConfig;
