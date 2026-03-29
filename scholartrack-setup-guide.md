# ScholarTrack — Setup Guide
## From Download to GitHub to Live Site

---

## Step 1: Download & Extract the Project

After downloading `scholartrack-project.tar.gz` from this chat:

```bash
# Move to where you want the project (e.g., your home folder or Desktop)
cd ~/Desktop

# Extract the archive
tar -xzf scholartrack-project.tar.gz

# Enter the project folder
cd scholartrack
```

---

## Step 2: Verify It Works Locally

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open your browser to `http://localhost:5173` — you should see ScholarTrack running.

Test the admin panel: click "Admin" in the top-right → enter password: `scholar2026`

Press `Ctrl+C` in the terminal to stop the server when done.

---

## Step 3: Create a GitHub Repository

### Option A: Using GitHub.com (easiest)

1. Go to https://github.com/new
2. Fill in:
   - **Repository name**: `scholartrack`
   - **Description**: `A GradCafe-style anonymous scholarship results tracker`
   - **Visibility**: Private (for now — you can make it public later)
   - Do NOT check "Add a README" (we already have one)
3. Click **Create repository**
4. GitHub will show you a page with setup commands. Follow the ones below.

### Option B: Using GitHub CLI

```bash
# If you have the GitHub CLI installed:
gh repo create scholartrack --private --source=. --remote=origin
```

---

## Step 4: Push Your Code to GitHub

Run these commands from inside the `scholartrack/` folder:

```bash
# Initialize git
git init

# Add all files
git add .

# Make your first commit
git commit -m "Initial commit: ScholarTrack MVP with admin panel"

# Set the main branch
git branch -M main

# Connect to your GitHub repo (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/scholartrack.git

# Push!
git push -u origin main
```

Refresh your GitHub repo page — you should see all your files there.

---

## Step 5: Deploy to Vercel (free)

1. Go to https://vercel.com and sign up with your GitHub account
2. Click **"Add New Project"**
3. Find and select your `scholartrack` repository
4. Vercel will auto-detect it's a Vite project. Leave all settings as default.
5. Click **Deploy**

In about 30-60 seconds, your site will be live at:
`https://scholartrack-YOUR_USERNAME.vercel.app`

**From now on, every time you `git push`, Vercel automatically redeploys.**

---

## Step 6: (Optional) Custom Domain

1. Buy a domain from Namecheap, Porkbun, or Google Domains
   - Suggestions: `scholartrack.org`, `scholartrack.app`, `scholartrack.io`
   - Typical cost: $10-15/year

2. In Vercel dashboard → your project → Settings → Domains
3. Add your custom domain and follow the DNS instructions

---

## Daily Workflow (Making Changes)

Once everything is set up, your workflow for making changes is:

```bash
# 1. Make your changes to the code

# 2. See what changed
git status

# 3. Stage your changes
git add .

# 4. Commit with a message describing what you did
git commit -m "Added new feature: scholarship deadline tracking"

# 5. Push to GitHub (Vercel auto-deploys)
git push
```

That's it — your changes go live automatically.

---

## Useful Git Commands Cheat Sheet

| What you want to do | Command |
|---------------------|---------|
| See what files changed | `git status` |
| See the actual changes | `git diff` |
| Stage all changes | `git add .` |
| Stage one file | `git add src/App.jsx` |
| Commit | `git commit -m "your message"` |
| Push to GitHub | `git push` |
| Pull latest changes | `git pull` |
| See commit history | `git log --oneline` |
| Undo uncommitted changes | `git checkout -- filename` |

---

## What's Next?

Once you're live, the next step is **Phase 2: Adding Supabase** so that:
- Data persists (right now it resets on page refresh)
- Admin auth is proper (not a hardcoded password)
- Multiple users can submit and see each other's results in real-time

Come back to this chat (or start a new one) and we'll wire up Supabase together.
