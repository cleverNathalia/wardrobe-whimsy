import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@wardrobe-whimsy/design-tokens', '@wardrobe-whimsy/api-client'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
}

export default nextConfig
