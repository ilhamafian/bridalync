import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  async redirects() {
    return [
      {
        source: "/dashboard/analytics",
        destination: "/dashboard/payments",
        permanent: true,
      },
      {
        source: "/dashboard/packages",
        destination: "/dashboard/settings/packages",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
