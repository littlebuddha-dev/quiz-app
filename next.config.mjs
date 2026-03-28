// Path: next.config.mjs
// Title: Next.js Configuration
// Purpose: Configure Next.js settings, allowing external images from placehold.jp to be displayed securely.

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@clerk/nextjs"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.jp',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;

