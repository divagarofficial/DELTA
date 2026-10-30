/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
  async rewrites() {
    // If NEXT_PUBLIC_BACKEND_API_URL is configured (e.g. on Vercel pointing to Cloud Run)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
    if (!backendUrl) return [];

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl.replace(/\/$/, '')}/api/:path*`,
      },
      {
        source: '/:version/:id',
        destination: `${backendUrl.replace(/\/$/, '')}/:version/:id`,
      },
      {
        source: '/:version/:id/:path*',
        destination: `${backendUrl.replace(/\/$/, '')}/:version/:id/:path*`,
      },
    ];
  },
};

export default nextConfig;
