# iPhone playtest deployment

1. Create a private GitHub repository and upload the **game/** directory plus the root `render.yaml`.
2. Provision a PostgreSQL database with a free tier that supports an external SSL connection (for example, Neon). Copy its pooled `postgresql://` connection string.
3. On Render, create a Blueprint from the GitHub repository. Set the required `DATABASE_URL` secret. The root render.yaml specifies `rootDir: game`.
4. Wait for the service health check at `/api/health`, then open `/adventure.html` on the Render HTTPS URL in Safari.
5. In Safari use Share > Add to Home Screen. Sign up and test a floor; then check that saves survive a Render restart.

**Important:** This is a private alpha, not a security-reviewed public service. Database snapshots are serialized, so running multiple server instances is unsafe. Free providers may pause projects, change quotas, or expire databases. Export periodic backups. Auth sessions are memory-only and require login after restart. Never commit DATABASE_URL. No live hosting is provisioned by this archive.
