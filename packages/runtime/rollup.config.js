import resolve from "@rollup/plugin-node-resolve";
import typescript from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-terser";
import pkg from "./package.json";

export default {
	input: "src/index.ts",
	output: [
		{
			format: "cjs",
			file: pkg.main,
			sourcemap: false,
		},
		{
			name: pkg["umd:name"] || pkg.name,
			format: "umd",
			file: pkg.unpkg,
			sourcemap: false,
			plugins: [terser()],
		},
	],
	external: [
		...require("module").builtinModules,
		...Object.keys(pkg.dependencies || {}),
		...Object.keys(pkg.peerDependencies || {}),
	],
	plugins: [
		resolve(),
		typescript({
			useTsconfigDeclarationDir: true,
		}),
	],
};
