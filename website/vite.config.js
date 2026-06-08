import { promises as fs } from 'fs';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const outputBasePath = './../public';
const outputFilePath = 'scripts/website.js';

export default defineConfig({
  plugins: [
    react(),
    {
      closeBundle: async() => {
        // Hack Ant.Design v5 Performance Issues
        const bundlePath = `${outputBasePath}/${outputFilePath}`
        try {
          let data = await fs.readFile(bundlePath, 'utf-8');
          data = data.replace('function scrollTo(', 'function $_scrollTo_antd_bug_$(');
          await fs.writeFile(bundlePath, data, 'utf-8');
        } catch (e) {
          console.error("Vite post-build script error: ", e);
        }
      }
    }
  ],
  build: {
    sourcemap: true,
    rollupOptions: {
      input: 'src/index.jsx',
      output: {
        format: 'iife',
        dir: outputBasePath,
        entryFileNames: outputFilePath,
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split(".");
          let extType = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `images/[name][extname]`;
          } else if (/css/i.test(extType)) {
            return `styles/website[extname]`;
          } else {
            return `[name][extname]`;
          }
        },
        chunkFileNames: "website-chunk.js",
        manualChunks: undefined,
      },
      onLog(level, log, handler) {
        if (log.cause && log.cause.message === `Can't resolve original location of error.`) {
          return;
        }
        handler(level, log);
      },
      onwarn: (warning, warn) => {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE' || warning.code == 'EVAL') {
          return;
        }
        warn(warning);
      }
    }
  }
})
