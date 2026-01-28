import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-external-papers',
      configureServer(server) {
        server.middlewares.use('/papers', (req, res, next) => {
          // req.url will be something like "/01/1/3110001/Summer_2025.pdf"
          const cleanPath = req.url.split('?')[0];
          const filePath = path.join(process.cwd(), '..', 'papers', cleanPath);

          if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
            res.setHeader('Content-Type', 'application/pdf');
            // Allow download attribute to work correctly
            res.setHeader('Access-Control-Allow-Origin', '*');
            fs.createReadStream(filePath).pipe(res);
          } else {
            next();
          }
        });
      }
    }
  ],
  server: {
    fs: {
      allow: ['..']
    }
  },
  publicDir: 'public'
})
