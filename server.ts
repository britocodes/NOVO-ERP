import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Routes for Bling Proxy
  app.get("/api/download-project", async (req, res) => {
    try {
      const archiver = (await import("archiver")).default;
      const archive = archiver("zip", { zlib: { level: 9 } });

      res.attachment("projeto-erp-fabrica.zip");

      archive.pipe(res);

      // Add files from root directory, excluding node_modules, .git, dist, etc.
      archive.glob("**/*", {
        cwd: __dirname,
        ignore: ["node_modules/**", ".git/**", "dist/**", ".env", ".env.local", ".DS_Store"]
      });

      await archive.finalize();
    } catch (error: any) {
      console.error("Download Error:", error);
      res.status(500).send("Erro ao gerar arquivo zip.");
    }
  });

  app.post("/api/bling/token", async (req, res) => {
    try {
      const { code, client_id, client_secret, redirect_uri, grant_type, refresh_token } = req.body;
      
      const credentials = btoa(`${client_id}:${client_secret}`);
      const body = new URLSearchParams();
      
      if (grant_type === 'authorization_code') {
        body.append('grant_type', 'authorization_code');
        body.append('code', code);
        body.append('redirect_uri', redirect_uri);
      } else if (grant_type === 'refresh_token') {
        body.append('grant_type', 'refresh_token');
        body.append('refresh_token', refresh_token);
      }

      const response = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: body
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error: any) {
      console.error('Bling Token Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.all("/api/bling/*", async (req, res) => {
    // Skip if it's the token endpoint we just handled
    if (req.path === '/api/bling/token') return;

    try {
      // Remove /api/bling prefix
      const endpoint = req.path.replace(/^\/api\/bling/, '');
      const method = req.method;
      const apiKey = req.headers['authorization'] || '';
      const query = new URLSearchParams(req.query as any).toString();
      
      const url = `https://www.bling.com.br/Api/v3${endpoint}${query ? `?${query}` : ''}`;
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: ['POST', 'PUT', 'PATCH'].includes(method) ? JSON.stringify(req.body) : undefined
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error: any) {
      console.error('Bling Proxy Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware initialized");
    } catch (e) {
      console.error("Failed to load Vite:", e);
    }
  } else {
    // Serve static files in production
    const distPath = path.resolve(__dirname, "dist");
    if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        
        app.get("*", (req, res) => {
            if (req.path.startsWith('/api')) {
                return res.status(404).json({ error: 'Not Found' });
            }
            res.sendFile(path.join(distPath, "index.html"));
        });
    } else {
        console.error("Dist folder not found. Run 'npm run build' first.");
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
