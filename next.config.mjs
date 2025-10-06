/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
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
