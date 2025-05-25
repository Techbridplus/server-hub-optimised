import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      "kzjxqjjkrodv2aqb.public.blob.vercel-storage.com", // Add your hostname here
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
