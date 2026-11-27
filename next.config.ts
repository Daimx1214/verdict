import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  serverExternalPackages: ["@xenova/transformers", "pg"],
  // Serverless (Gemini embedding backend): alias the local-models package to a
  // stub so it is excluded from the function bundle entirely.
  ...(process.env.EMBED_BACKEND === "gemini"
    ? { turbopack: { resolveAlias: { "@xenova/transformers": "./lib/retrieval/transformers-stub.ts" } } }
    : {}),
  async headers() {
    const base = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'" },
    ];
    return [
      { source: "/embed", headers: [...base.slice(0, 3), { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors *" }] },
      { source: "/((?!embed).*)", headers: base },
    ];
  },
};
export default nextConfig;
