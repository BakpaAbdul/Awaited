# Awaited

**A GradCafe-style anonymous scholarship results tracker.**

Scholarship timelines are opaque. Applicants have no way to know whether decisions have been sent out, whether silence means rejection, or whether others with similar profiles got through. Awaited fixes that.

Users anonymously report their scholarship application outcomes (Applied → Interview → Waitlisted → Accepted/Rejected), and others can browse and search that data to gauge timelines and chances.

---

## Features

### For applicants
- **Anonymous result submission** — report scholarship name, status, date, study level, country. Optionally share GPA, nationality, field of study.
- **Search & filter** — find results by scholarship name, country, study level, or status.
- **Scholarship pages** — click any scholarship to see its dedicated page with a visual status breakdown.
- **Discussion threads** — comment anonymously on any result to ask questions or share tips.

### For admins
- **Password-protected admin panel** — accessible from within the app.
- **Content moderation** — hide spam/fake submissions, delete entries, remove individual comments.
- **Analytics dashboard** — status distribution, top scholarships, submissions by month, country and level breakdowns.
- **Verified scholarship list** — manage a canonical list of scholarship names. Submissions with unverified names are flagged for review. The submit form autocompletes from the verified list.

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + Vite | Fast dev server, optimized builds |
| Hosting | Vercel (planned) | Auto-deploys from GitHub |
| Database | Supabase | PostgreSQL + Edge Functions |
| Styling | Inline styles | No CSS framework dependency |

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or later
- npm (comes with Node.js)
- A GitHub account

### Local development

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/awaited.git
cd awaited

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

The app will be running at `http://localhost:5173`.

### Persistence
Awaited now has two data modes:

- **Supabase mode** — shared backend for all users when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured
- **Browser-local fallback** — local persistence when Supabase is not configured

The browser-local mode keeps the app usable during setup, but real multi-user data requires Supabase mode. If Supabase is configured but temporarily unreachable, the app now falls back clearly and tells you that the current session is local-only.

### Admin access
Click the **Admin** button in the top-right corner and enter the password: `scholar2026`

In browser-local fallback, this uses `VITE_ADMIN_PASSWORD`.

In Supabase mode, moderation is routed through the `admin-actions` Edge Function and should use the server-side `AWAITED_ADMIN_PASSWORD` secret.

### Supabase Setup
1. Create a Supabase project.
2. Run the SQL in [supabase/schema.sql](/Users/abdulbaari/Scholartrack/supabase/schema.sql) in the Supabase SQL editor.
3. Optionally run [supabase/seed.sql](/Users/abdulbaari/Scholartrack/supabase/seed.sql) if you want the shared backend to start with the same beta sample reports as the frontend fallback.
4. Deploy the moderation Edge Function from [supabase/functions/admin-actions/index.ts](/Users/abdulbaari/Scholartrack/supabase/functions/admin-actions/index.ts).
   The bundled [supabase/config.toml](/Users/abdulbaari/Scholartrack/supabase/config.toml) already disables JWT verification for this beta password-based moderation flow.
5. Set the Edge Function secret `AWAITED_ADMIN_PASSWORD` to your real admin password.
6. Create `.env.local` from `.env.example` and fill in:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_ADMIN_FUNCTION=admin-actions
```

7. Restart the dev server.

When those env vars are present, Awaited switches from browser-local storage to the shared Supabase backend automatically. Realtime updates are enabled for results, comments, and verified scholarship names.

### Vercel Deployment
Your frontend stays on Vercel. The backend lives in Supabase.

1. Keep deploying the React app to Vercel as usual.
2. In Vercel project settings, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_ADMIN_FUNCTION=admin-actions`
3. Redeploy the site.

Once those env vars are present in Vercel, the deployed frontend will use the shared Supabase backend instead of browser-local storage.

### Abuse Controls
The current backend now enforces a few guardrails directly in Postgres:

- results and comments have length limits
- links are blocked in public notes and comments
- realtime is enabled so moderation changes propagate quickly

This is still a beta moderation stack. You should add proper rate limiting and CAPTCHA before a wider launch.

---

## Project Structure

```
awaited/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/       # (Phase 2: extracted components)
│   ├── lib/
│   │   ├── appDataStore.js
│   │   ├── constants.js
│   │   ├── contentPolicy.js
│   │   ├── persistence.js
│   │   └── supabaseClient.js
│   ├── App.jsx           # Main application component
│   ├── main.jsx          # React entry point
│   └── index.css         # Global styles and reset
├── .env.example          # Environment variable template
├── .gitignore
├── index.html            # HTML entry point
├── LICENSE               # MIT License
├── package.json
├── README.md
├── supabase/
│   ├── config.toml
│   ├── schema.sql
│   ├── seed.sql
│   └── functions/
└── vite.config.js
```

---

## Roadmap

### Phase 1 — MVP Frontend ✅
- [x] Anonymous result submission
- [x] Browse and filter results
- [x] Scholarship detail pages with status breakdown
- [x] Anonymous discussion/comments
- [x] Admin panel with moderation, analytics, verified list
- [x] Project scaffolded with Vite, ready for GitHub

### Phase 2 — Backend (Supabase)
- [ ] Set up Supabase project and database tables
- [x] Replace local-only state with Supabase-backed API calls plus browser-local fallback
- [ ] Move admin auth to Supabase Auth
- [x] Real-time updates via Supabase subscriptions

### Phase 3 — Deploy
- [ ] Connect GitHub repo to Vercel
- [ ] Configure environment variables on Vercel
- [ ] Set up custom domain (awaited.org or similar)

### Phase 4 — Growth Features
- [ ] Email notifications for specific scholarships
- [ ] Upvoting on comments
- [ ] "Subscribe" to a scholarship for new result alerts
- [ ] Scholarship deadline calendar
- [ ] Data export (CSV) for researchers
- [ ] Dark/light theme toggle

---

## Contributing

Awaited will be open-sourced once the core is stable. If you're interested in contributing, watch this repo for updates.

---

## License

MIT — see [LICENSE](LICENSE).
