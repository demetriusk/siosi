/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

// Integrate next-intl plugin so the runtime can resolve config correctly
try {
  const nextIntl = require('next-intl/plugin')();
  module.exports = nextIntl(nextConfig);
} catch (e) {
  // If the plugin isn't available, export the plain config so dev still runs
  module.exports = nextConfig;
}
