/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: [
    'playwright',
    'playwright-extra',
    'puppeteer-extra-plugin-stealth',
  ],
};

export default nextConfig;
