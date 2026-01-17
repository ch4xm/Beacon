import path from "path";
import { defineConfig } from "vite";
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react(), nodePolyfills()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        proxy: {
            "/api": {
                target: "http://localhost:3000",
                changeOrigin: true,
            },
            "/heartbeat": {
                target: "http://localhost:3000",
                changeOrigin: true,
            },
        },
    },
});
