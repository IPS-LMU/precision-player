import typescript from '@rollup/plugin-typescript';

// rollup.config.js
export default {
    input: 'src/index.ts',
    output: {
        file: 'dist/js/precision_player.js',
        name: 'PrecisionPlayer',
        format: 'iife'
    },
    plugins: [
        typescript({
            target: "ES5",
            declaration: true,
            outDir: "dist/js",
            rootDir: "src"
        })
    ]
};
