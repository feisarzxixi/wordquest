/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // 避免开发模式双次触发影响状态机与发音
  swcMinify: true,
};

module.exports = nextConfig;
