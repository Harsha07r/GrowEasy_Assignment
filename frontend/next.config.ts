import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pins the workspace root to this app so an unrelated lockfile higher up
  // the filesystem (outside this project) isn't mistaken for the root.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
