/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async redirects() {
    return [
      // Ancienne route /souvenirs renommée en /recits (juin 2026)
      {
        source: '/souvenirs',
        destination: '/recits',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
