/** AiRefCheck - next.config.mjs
 * Next.js 14 configuration with shared package transpilation
 * and optimized package imports for lucide-react.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@airefcheck/shared'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
