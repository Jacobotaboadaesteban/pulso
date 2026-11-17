import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import { sites } from "./scripts/vite/sites-vite-plugin";

export default defineConfig({
  plugins: [
    vinext(),
    sites({ mockAuth: true }),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
      inspectorPort: false,
    }),
  ],
});
