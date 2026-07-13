# The Internet Rest Stop — server

Real backend for theinternetreststop.com: username/password accounts
(no email, on purpose) and a "My Stops" bookmark list, backed by
Postgres. Built with Node, Express, and vanilla JS on the frontend —
no build step needed.

## What's inside

- `server.js` — Express app entry point
- `db/schema.sql` — the two tables: `users`, `saved_links`
- `db/migrate.js` — run once to create those tables
- `db/index.js` — Postgres connection pool
- `routes/auth.js` — register / login / logout / who-am-i
- `routes/links.js` — save / list / remove bookmarked cards
- `public/index.html` — the site itself (login screen + directory + modal)

## Deploying to Render

### 1. Get the code into GitHub

Render deploys from a Git repo, so this needs to live in GitHub first.

1. Unzip this folder somewhere on your computer.
2. Create a new repo on GitHub (e.g. `internet-rest-stop`).
3. From inside the unzipped folder:
   ```
   git init
   git add .
   git commit -m "Initial server"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/internet-rest-stop.git
   git push -u origin main
   ```

### 2. Create the services on Render

Easiest path — use the included Blueprint:

1. Go to https://dashboard.render.com
2. Click **New +** → **Blueprint**
3. Connect your GitHub account and select the `internet-rest-stop` repo
4. Render reads `render.yaml` and sets up two things automatically:
   - A free **PostgreSQL** database (`reststop-db`)
   - A free **Web Service** (`internet-rest-stop`) wired to that database
5. Click **Apply** — Render will install dependencies and start the server

If you'd rather do it by hand instead of the Blueprint: create a
**PostgreSQL** instance first (free plan), then create a **Web Service**
from the same repo, and manually set the `DATABASE_URL` env var to the
database's "Internal Connection String" plus a `SESSION_SECRET` to any
random string.

### 3. Create the database tables

The tables don't exist yet on a fresh database. After the first deploy:

1. In the Render dashboard, open your **internet-rest-stop** web service
2. Click **Shell** (top right)
3. Run:
   ```
   npm run migrate
   ```
   You should see `Migration complete. Tables ready: users, saved_links`

You only need to do this once (or again if you ever wipe the database).

### 4. Point your domain at it

1. In the web service settings, go to **Custom Domains**
2. Add `theinternetreststop.com` (and `www.theinternetreststop.com` if you want both)
3. Render will give you a DNS record to add at your domain registrar
   (usually a CNAME, or an A record if it's the root domain)
4. Add that record wherever you bought the domain — propagation can
   take a few minutes to a few hours

### Notes on the free tier

- Render's free web services spin down after 15 minutes of no traffic,
  and take ~30-50 seconds to wake back up on the next visit. Fine for
  testing, worth knowing about before you send this to anyone.
- Render's free Postgres databases expire after 30 days unless upgraded
  to a paid plan — you'll get an email warning first.

## Running it locally (optional)

If you have Postgres installed locally:

```
cp .env.example .env
# edit .env with your local DATABASE_URL and a SESSION_SECRET
npm install
npm run migrate
npm start
```

Then open http://localhost:3000
