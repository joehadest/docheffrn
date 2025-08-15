/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    swcMinify: false,
  },
  webpack: (config, { isServer }) => {
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

module.exports = nextConfig 