/** @type {import('next').NextConfig} */
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
    
    // Force relative paths for all chunks
    config.output.publicPath = './';
    
    return config;
  },
  // Enable static export for deployment
  output: 'export',
  trailingSlash: true,
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  // Force relative paths for all assets
  assetPrefix: './',
  basePath: '',
}

module.exports = nextConfig 