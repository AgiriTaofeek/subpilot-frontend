import { cloudflare } from "@cloudflare/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// @cloudflare/vite-plugin's dev-server integration currently crashes on
// startup against this Vite version ("viteDevServer.environments[...]
// .initRunner is not a function") — a known, open upstream bug with no fix
// yet: https://github.com/cloudflare/workers-sdk/issues/13952. This app
// doesn't use any real Workers bindings (KV/D1/R2/Durable Objects) during
// local dev today, just a plain env var, so the plugin's dev-server
// integration isn't actually load-bearing for `vite dev`. Skip it there
// only; it stays in for build/preview/deploy, where it shapes the
// Workers-compatible output. Remove this guard once upstream is fixed.
const skipCloudflarePlugin = process.env.SKIP_CLOUDFLARE_VITE_PLUGIN === "true";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		devtools(),
		!skipCloudflarePlugin && cloudflare({ viteEnvironment: { name: "ssr" } }),
		nitro({ rollupConfig: { external: [/^@sentry\//] } }),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
		babel({ presets: [reactCompilerPreset()] }),
	],
});

export default config;
