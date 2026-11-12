# Jadeer website

React (Vite) site + Node/Express API with PostgreSQL (Prisma). All text and images are editable from the dashboard at `/admin`.

## Run locally

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
2. Install and set up the database:
   ```bash
   npm install
   npx prisma migrate dev
   npm run db:seed
   ```
3. Start site + API together: `npm run dev` → site on http://localhost:5173, dashboard on http://localhost:5173/admin

## Deploy

```bash
npm install
npm run build
npm run db:migrate
npm run db:seed      # first time only: creates the admin login + default content
npm start            # serves the site, dashboard and API on $PORT (default 4000)
```
Keep the `uploads/` (dashboard images/videos) and `private-uploads/` (applicants' CVs, admin-only) folders on persistent storage.
Change the admin password from the dashboard after the first login.

## Where things are

- `src/content.js` — default text/images (used to seed the database and as a fallback)
- `src/components/`, `src/pages/` — site sections and the Careers / Contact pages
- `src/admin/` — dashboard
- `server/index.js` — API (login, content, uploads)
- `prisma/schema.prisma` — database tables
- `src/styles/` — `global.css` (original design), `updates.css`, `pages.css`
