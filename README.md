# Account Ops

Internal tool for tracking account-creation work across a team:

- **Admin dashboard** (`/admin/dashboard`, password-protected): add unlimited account types, set a required quantity per type, see assigned/remaining counts live, open or close each type.
- **Worker form** (`/worker`, no login): Discord username, a dropdown of currently open types, and a quantity field capped at what's remaining.
- On submit: the remaining count is decremented atomically (safe even if two workers submit at the same instant), the submission is logged, and a Discord webhook message fires with the worker's name, account type, quantity, and timestamp.

Built with Next.js (App Router) + Upstash Redis for storage. Both have generous free tiers.

---

## 1. One-time setup

### A. Get the code onto GitHub
1. Create a new empty repo on GitHub.
2. Push this folder to it:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

### B. Create a free Redis database (Upstash)
1. Go to https://vercel.com/marketplace and search **Upstash**, or go directly to https://upstash.com and sign up (free).
2. Create a new **Redis** database (any nearby region).
3. On the database page, copy the **REST URL** and **REST TOKEN** — you'll paste these into Vercel in step C.

### C. Deploy to Vercel
1. Go to https://vercel.com, sign up/log in, click **Add New → Project**, and import the GitHub repo you just pushed.
2. Vercel will detect it's a Next.js app automatically — leave the build settings as default.
3. Before deploying, open **Environment Variables** and add:

   | Key | Value |
   |---|---|
   | `ADMIN_PASSWORD` | a password only you know |
   | `SESSION_SECRET` | a long random string (e.g. run `openssl rand -hex 32` locally, or use any password generator) |
   | `DISCORD_WEBHOOK_URL` | see step D below |
   | `UPSTASH_REDIS_REST_URL` | from step B |
   | `UPSTASH_REDIS_REST_TOKEN` | from step B |

4. Click **Deploy**. After it finishes, Vercel gives you a live URL like `https://your-project.vercel.app`.

### D. Create the Discord webhook
1. In your Discord server, go to the channel you want notifications in → **Edit Channel → Integrations → Webhooks → New Webhook**.
2. Name it, copy the **Webhook URL**, and paste it as `DISCORD_WEBHOOK_URL` in Vercel (step C).
3. If you add or change the webhook later, update the env var in Vercel's project settings and redeploy (or just click **Redeploy** — no code change needed).

---

## 2. Day-to-day use

- **Admin:** go to `https://your-project.vercel.app/admin/login`, sign in with `ADMIN_PASSWORD`.
  - Add an account type with a name and a required quantity.
  - Toggle **Open/Close** to control whether it shows up on the worker form.
  - Edit the name or required quantity, or delete a type, any time.
  - Recent submissions are listed at the bottom of the dashboard.
- **Workers:** send them `https://your-project.vercel.app/worker`. No account needed. They pick an open type, enter a quantity (capped automatically at what's left), and submit. You get a Discord ping instantly.

## 3. Local development (optional)

```bash
npm install
cp .env.example .env.local   # fill in the same values as above
npm run dev
```
Visit http://localhost:3000.

## Notes

- Changing `ADMIN_PASSWORD` or `SESSION_SECRET` in Vercel invalidates any existing admin session (you'll need to log in again) — that's expected.
- The worker link and the Discord webhook are two independent things: the link is what workers use to submit, the webhook is just where you get notified.
- All data lives in your Upstash Redis database, not in the app's code, so it's safe across redeploys.
