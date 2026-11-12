import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      /* Page copy is ported verbatim from the static site; plain apostrophes
         and quotes in JSX text render identically to the escaped entities. */
      "react/no-unescaped-entities": "off",
      /* Navigation uses plain anchors on purpose: the site is a static
         export on GitHub Pages, and the nav hrefs are the served .html
         URLs (/docs.html, /status.html), not Next route paths. */
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
