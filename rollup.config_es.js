import typescript from '@rollup/plugin-typescript';
import generatePackageJson from 'rollup-plugin-generate-package-json'

// rollup.config.js
export default {
    input: 'src/index.ts',
    output: {
        dir: 'dist/es',
        name: 'PrecisionPlayer',
        format: 'es'
    },
    plugins: [
        typescript({
            target: "ES5",
            declaration: true,
            outDir: "dist/es",
            rootDir: "src"
        }),
        generatePackageJson({
            outputFolder: "dist",
            baseContents: (pkg) => {
                pkg.main = "es/index.js";
                pkg.scripts = undefined;
                return pkg;
            }
        })
    ]
};
