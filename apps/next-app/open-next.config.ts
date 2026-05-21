import { defineCloudflareConfig, type OpenNextConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig() as OpenNextConfig;

config.default.minify = true;

if (config.middleware?.external) {
  config.middleware.minify = true;
}

config.default.install = {
  packages: ["pg-cloudflare@1.4.0", "semver@7.7.3"],
};

export default config;
