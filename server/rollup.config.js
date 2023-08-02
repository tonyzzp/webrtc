import { defineConfig } from "rollup"
import rollupTypescript from "@rollup/plugin-typescript"
import rollupNodeResolve from "@rollup/plugin-node-resolve"
import rollupComonjs from "@rollup/plugin-commonjs"
import rollupJson from "@rollup/plugin-json"


export default defineConfig({
    input: "main.ts",
    output: {
        file: "dist/main.mjs",
        format: "es"
    },
    plugins: [
        rollupNodeResolve(),
        rollupTypescript(),
        rollupComonjs(),
        rollupJson()
    ]
})