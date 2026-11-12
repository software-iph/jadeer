# Deploying Jadeer on a VPS (Docker + Nginx Proxy Manager)

The site runs as two containers:

| Container   | What it is                                   | Reachable from        |
|-------------|----------------------------------------------|-----------------------|
| `jadeer-app`| website + dashboard (`/admin`) + API, port 4000 | Nginx Proxy Manager |
| `jadeer-db` | PostgreSQL 17                                | only `jadeer-app`     |

Data is kept in Docker volumes, so it survives restarts and updates:
`jadeer_db-data` (database), `jadeer_uploads` (dashboard images/videos), `jadeer_private-uploads` (CVs).

---

## 0. Look at the VPS first (read-only — changes nothing)

Run these on the VPS and keep the output. They show how your other sites and Nginx Proxy Manager are set up:

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Networks}}'
```
```bash
docker network ls
```
```bash
docker ps --format '{{.Names}}  {{.Image}}  networks: {{.Networks}}' | grep -i -E 'nginx|npm|proxy'
```
```bash
sudo ss -tlnp | grep -E ':(80|443|81|4010)\b'
```
```bash
docker compose version && free -h && df -h /
```

What to look for:
- **The network Nginx Proxy Manager is on** (3rd command) — usually something like `npm_default`, `nginx-proxy-manager_default` or `proxy`. That goes into `PROXY_NETWORK`.
- **Port 4010 must be free** (4th command prints nothing for 4010). If it's used, pick another `APP_PORT`.
- At least **1 GB free RAM** and **3 GB free disk** for the build.

---

## 1. Get the code

```bash
cd /opt && sudo git clone https://github.com/software-iph/jadeer.git && sudo chown -R $USER:$USER jadeer && cd jadeer
```

## 2. Settings

```bash
cp .env.docker.example .env
```
```bash
openssl rand -hex 32
```
Edit `.env` (`nano .env`):
- `POSTGRES_PASSWORD` and `JWT_SECRET` → paste a different `openssl rand -hex 32` value into each
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` → the first dashboard login
- `PROXY_NETWORK` → the network name from step 0

## 3. Start

```bash
docker compose up -d --build
```
```bash
docker compose logs -f app
```
Wait for `Jadeer API on http://localhost:4000` (Ctrl+C leaves the logs; the site keeps running).

Quick check from the VPS itself:
```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4010/
```
`200` means it works.

## 4. Nginx Proxy Manager

**Hosts → Proxy Hosts → Add Proxy Host**

| Field | Value |
|---|---|
| Domain Names | `jadeer.ly`, `www.jadeer.ly` (your domain) |
| Scheme | `http` |
| Forward Hostname / IP | `jadeer-app` |
| Forward Port | `4000` |
| Cache Assets | off |
| Block Common Exploits | on |
| Websockets Support | off (not needed) |

**SSL tab:** Request a new Let's Encrypt certificate, tick *Force SSL* and *HTTP/2 Support*.

**Advanced tab** — paste this so large dashboard uploads (videos) and CVs aren't rejected:
```nginx
client_max_body_size 100m;
proxy_read_timeout 120s;
```

> If NPM is **not** in Docker (or can't use `jadeer-app`): forward to the VPS IP instead —
> Forward Hostname = the VPS's private/docker gateway IP (often `172.17.0.1`), Forward Port = `4010`,
> and set `APP_BIND=0.0.0.0` in `.env` (then block port 4010 in the firewall: `sudo ufw deny 4010`).

Make sure the domain's DNS **A record** points to the VPS IP before requesting the certificate.

## 5. First login

Open `https://your-domain/admin`, sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`, then **Password → change it**.

---

## Updating after new changes are pushed to GitHub

```bash
cd /opt/jadeer && git pull && docker compose up -d --build
```
Database changes are applied automatically when the app starts. Your content, uploads and CVs are kept.

## Everyday commands

| Task | Command |
|---|---|
| Logs | `docker compose logs -f app` |
| Restart | `docker compose restart app` |
| Stop | `docker compose down` (data is kept) |
| Status | `docker compose ps` |

## Backups

```bash
docker exec jadeer-db pg_dump -U jadeer jadeer | gzip > jadeer-db-$(date +%F).sql.gz
```
```bash
docker run --rm -v jadeer_uploads:/u -v jadeer_private-uploads:/p -v $PWD:/b alpine tar czf /b/jadeer-files-$(date +%F).tgz /u /p
```

Restore the database (into a fresh, empty volume):
```bash
gunzip -c jadeer-db-YYYY-MM-DD.sql.gz | docker exec -i jadeer-db psql -U jadeer jadeer
```

## Moving the content from your PC

Your current content (texts edited in the dashboard, jobs) is in the PostgreSQL database on your PC.
To copy it to the VPS, export it on the PC (PowerShell, in the project folder), copy the file to the VPS, then import:
```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -h localhost --data-only --column-inserts -t '"Content"' -t '"Upload"' -f jadeer-content.sql jadeer
```
```bash
scp jadeer-content.sql user@YOUR-VPS-IP:/opt/jadeer/
```
```bash
docker exec -i jadeer-db psql -U jadeer jadeer < jadeer-content.sql
```
(Run the import after step 3, and first clear the default row: `docker exec jadeer-db psql -U jadeer jadeer -c 'DELETE FROM "Content";'`.)
Images you uploaded on the PC live in the `uploads/` folder there — copy them into the volume with
`docker cp uploads/. jadeer-app:/app/uploads/`.

## Troubleshooting

| Problem | Fix |
|---|---|
| `network ... declared as external, but could not be found` | `PROXY_NETWORK` in `.env` is wrong — check step 0 |
| NPM shows **502 Bad Gateway** | `docker compose ps` — app must be `healthy`; NPM and `jadeer-app` must share `PROXY_NETWORK` |
| Upload fails with **413** | add `client_max_body_size 100m;` in the NPM Advanced tab |
| Can't sign in to `/admin` | check `docker compose logs app`; the first admin is created from `.env` only on the very first start |
