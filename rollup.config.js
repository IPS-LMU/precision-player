// rollup.config.js
import typescript from "@rollup/plugin-typescript";
import {terser} from "rollup-plugin-terser";

export default {
    input: 'src/index.ts',
    output: [
        {
            file: 'dist/js/precision_player.js',
            name: 'PrecisionPlayer',
            format: 'iife'
        },
        {
            file: 'dist/js/precision_player.min.js',
            name: 'PrecisionPlayer',
            format: 'iife',
            plugins: [
                terser()
            ]
        }
    ],
    plugins: [
        typescript({
            target: "ES5",
            declaration: true,
            outDir: "dist/js",
            rootDir: "src"
        })
    ]
};
