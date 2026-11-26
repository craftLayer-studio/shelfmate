import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // PGlite ships WASM and node-postgres uses native modules: load them from node_modules at runtime.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
};

export default nextConfig;
