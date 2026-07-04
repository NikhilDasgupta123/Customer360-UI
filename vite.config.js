import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_URL = process.env.CUSTOMERGRAPH_BACKEND_URL || 'http://127.0.0.1:8000';
const SWAGGER_HTML_PATH = path.join(__dirname, 'swagger-local.html');

/**
 * Development-only Swagger page.
 * It runs at http://localhost:5173/docs, so it shares the React app's
 * localStorage and can add the already-logged-in Bearer token to Swagger.
 */
function customerGraphSwaggerDocsPlugin() {
  return {
    name: 'customergraph-swagger-same-login',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestPath = String(request.url || '').split('?')[0];
        const acceptsHtml = String(request.headers.accept || '').includes('text/html');

        if (request.method !== 'GET' || !acceptsHtml || (requestPath !== '/docs' && requestPath !== '/docs/')) {
          next();
          return;
        }

        try {
          response.statusCode = 200;
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.setHeader('Cache-Control', 'no-store');
          response.end(fs.readFileSync(SWAGGER_HTML_PATH, 'utf8'));
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

const backendProxy = {
  target: BACKEND_URL,
  changeOrigin: true,
  secure: false,
};

export default defineConfig({
  plugins: [react(), customerGraphSwaggerDocsPlugin()],
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': backendProxy,
      '/openapi.json': backendProxy,
      '/docs/oauth2-redirect': backendProxy,
    },
  },
  preview: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': backendProxy,
      '/openapi.json': backendProxy,
      '/docs/oauth2-redirect': backendProxy,
    },
  },
});
