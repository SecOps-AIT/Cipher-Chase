/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
