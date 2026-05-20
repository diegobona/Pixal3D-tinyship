import { defineCloudflareConfig, type OpenNextConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig() as OpenNextConfig;

config.default.install = {
  packages: ["pg-cloudflare@1.4.0", "proxy-agent@8.0.1"],
};

export default config;
