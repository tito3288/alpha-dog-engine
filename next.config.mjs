/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip static optimization to prevent build-time page data collection
  // This is necessary because our API routes require database access
  experimental: {
    // Disable static page generation for dynamic routes
    isrMemoryCacheSize: 0,
  },
  // Ensure all routes are treated as dynamic
  outputFileTracingIncludes: {
    '/api/**': ['./node_modules/**'],
  },
};

export default nextConfig;
