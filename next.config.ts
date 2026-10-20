import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // This app is a live public dashboard — every page reads fresh Supabase
  // data per request, so the Cache Components model (which prerenders by
  // default and requires explicit caching directives) fights the grain.
  // Plain dynamic rendering matches what the app actually needs.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
