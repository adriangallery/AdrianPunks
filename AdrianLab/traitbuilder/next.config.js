/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost', 'adrianpunks.com', 'ipfs.io', 'gateway.pinata.cloud'],
    unoptimized: true,
  },
  experimental: {
    // Removed appDir as it's now stable in Next.js 14
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
  // Enable static export for deployment
  output: 'export',
  trailingSlash: true,
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  // Base path and asset prefix for subfolder deployment
  basePath: isProd ? '/AdrianLab/traitbuilder' : '',
  assetPrefix: isProd ? '/AdrianLab/traitbuilder/' : '',
}

module.exports = nextConfig 