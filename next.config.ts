import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Static export: the whole site builds to plain HTML/CSS/JS in ./out.
     The site stays on GitHub Pages, so the app must stay host-portable:
     no API routes, no server actions, no middleware, no server-side
     image optimization. Every page is pre-rendered at build time. */
  output: "export",
  images: {
    /* Static export has no image optimization server. */
    unoptimized: true,
  },
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
