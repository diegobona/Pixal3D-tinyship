import { join, resolve } from 'path';
import type { NextConfig } from 'next'

import { config } from 'dotenv';

// Load .env file from root directory
// Note: __dirname is automatically provided by Next.js 16
config({ path: join(__dirname, '../../.env') });

// Resolve project root directory and libs directory absolute paths
const rootDir = resolve(__dirname || process.cwd(), '../..');
const libsDir = resolve(rootDir, 'libs');
const useStandaloneOutput = process.platform !== 'win32' || process.env.NEXT_OUTPUT_STANDALONE === '1';

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig= {
  webpack(config: any) {
    // Modify webpack configuration to handle SVG files
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: { and: [/\.(js|ts|md)x?$/] },
      use: [{
        loader: '@svgr/webpack',
      }],
    });

    // Add resolve paths for external folders
    config.resolve.alias = {
      ...config.resolve.alias,
      '@libs': libsDir
    };

    return config;
  },
  // Allow loading images from external directories
  images: {
    dangerouslyAllowSVG: true,
    domains: [],
  },
  // https://github.com/vercel/next.js/issues/50042
  // ali-oss uses urllib which requires proxy-agent (Node.js only)
  serverExternalPackages: ['mjml', 'handlebars', 'ali-oss', 'urllib'],
  // Keep Docker/Linux standalone output, while avoiding Windows local symlink EPERM.
  output: useStandaloneOutput ? 'standalone' : undefined,
  experimental: {
    // Allow importing from external directories
    externalDir: true,
  },
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;
