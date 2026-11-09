import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const swTemplatePath = fileURLToPath(new URL('./src/sw/sw.template.js', import.meta.url));

/**
 * Emits /sw.js at build time with the list of generated assets injected,
 * so the service worker precaches exactly the shell of this build and its
 * cache name changes whenever the build output changes.
 */
function serviceWorkerPlugin(): Plugin {
  return {
    name: 'amor-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const built = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      const staticFiles = [
        '/',
        '/app.html',
        '/offline.html',
        '/manifest.webmanifest',
        '/logo.svg',
        '/icons/icon-192.png',
        '/icons/icon-512.png',
        '/icons/maskable-512.png',
        '/icons/apple-touch-icon.png',
      ];
      const precache = [...staticFiles, ...built.map((f) => '/' + f)];
      const version = createHash('sha256').update(precache.join('|')).digest('hex').slice(0, 12);
      const source = readFileSync(swTemplatePath, 'utf8')
        .replace('__PRECACHE_LIST__', JSON.stringify(precache))
        .replace('__CACHE_VERSION__', JSON.stringify(version));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  plugins: [react(), serviceWorkerPlugin()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': { target: `http://localhost:${process.env.PORT ?? 8787}`, changeOrigin: false },
      '/sitemap.xml': { target: `http://localhost:${process.env.PORT ?? 8787}` },
    },
  },
  preview: {
    port: 4173,
    host: true,
    proxy: { '/api': { target: `http://localhost:${process.env.PORT ?? 8787}` } },
  },
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
