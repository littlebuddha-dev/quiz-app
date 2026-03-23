// Path: next.config.mjs
// Title: Next.js Configuration
// Purpose: Configure Next.js settings, allowing external images from placehold.jp to be displayed securely.

/** @type {import('next').NextConfig} */
const nextConfig = {
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
};

export default nextConfig;

