// rollup.config.js
import typescript from "@rollup/plugin-typescript";
import {terser} from "rollup-plugin-terser";
import copy from 'rollup-plugin-copy'

const license = require('rollup-plugin-license');

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
                terser({
                    format: {
                        comments: false
                    }
                })
            ]
        }
    ],
    plugins: [
        typescript({
            target: "ES5",
            declaration: true,
            outDir: "dist/js",
            rootDir: "src"
        }),
        license({
            banner: `<%= pkg.name %> v<%= pkg.version %>
Generated: <%= moment().format('YYYY-MM-DD HH:mm:ss') %>
Author: <%= pkg.author %>
LICENSE: <%= pkg.license %>`,
        }),
        copy({
            targets: [
                { src: 'src/precision-player.css', dest: 'dist/styles' },
                { src: 'README.md', dest: 'dist' },
                { src: 'LICENSE.txt', dest: 'dist' },
            ]
        })
    ]
};
