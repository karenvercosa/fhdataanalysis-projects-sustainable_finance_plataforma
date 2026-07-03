/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // O lint roda separadamente; o type-check já é feito no build.
  eslint: { ignoreDuringBuilds: true }
};

export default nextConfig;
