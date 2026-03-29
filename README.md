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
| Database | Supabase (planned) | PostgreSQL + REST API + Auth |
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

### Admin access
Click the **Admin** button in the top-right corner and enter the password: `scholar2026`

(This will move to proper Supabase Auth in Phase 2.)

---

## Project Structure

```
awaited/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/       # (Phase 2: extracted components)
│   ├── lib/
│   │   └── constants.js  # Statuses, levels, verified list, seed data
│   ├── App.jsx           # Main application component
│   ├── main.jsx          # React entry point
│   └── index.css         # Global styles and reset
├── .env.example          # Environment variable template
├── .gitignore
├── index.html            # HTML entry point
├── LICENSE               # MIT License
├── package.json
├── README.md
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
- [ ] Replace in-memory state with Supabase API calls
- [ ] Move admin auth to Supabase Auth
- [ ] Real-time updates via Supabase subscriptions

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
