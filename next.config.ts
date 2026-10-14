import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Static export: the whole site builds to plain HTML/CSS/JS in ./out */
  output: "export",
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
