# Momentum ADHD

Keep Mochi happy. Build real habits.

---

## Deploy in 3 steps

### Step 1 — Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to **Database > SQL Editor**
3. Paste the contents of `supabase_schema.sql` and click **Run**
4. Go to **Project Settings > API**
5. Copy your **Project URL** and **anon public** key — you'll need them in Step 3

**Enable Email auth:**
- Go to **Authentication > Providers**
- Make sure **Email** is enabled (it is by default)
- Optionally enable Google OAuth for easier login

---

### Step 2 — GitHub

```bash
# In the momentum-adhd folder:
git init
git add .
git commit -m "Initial commit — Momentum ADHD"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/momentum-adhd.git
git push -u origin main
```

---

### Step 3 — Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New > Project**
3. Import your `momentum-adhd` repo
4. Before deploying, add **Environment Variables**:
   - `VITE_SUPABASE_URL` → your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` → your Supabase anon key
5. Click **Deploy**

Vercel auto-detects Vite. No extra config needed.

---

## Local development

```bash
cp .env.example .env
# Fill in your Supabase credentials in .env

npm install
npm run dev
```

App runs at `http://localhost:5173`

---

## What works without Supabase

The app runs fully offline without env vars set. All state lives in React's useState — habits, grumpy meter, treats, achievements. Nothing persists across page refreshes.

Once you add the Supabase credentials, persistence is enabled automatically.

---

## PWA (Add to Home Screen)

After deploying to Vercel:
- **Android**: Chrome will prompt you to install, or use the browser menu
- **iOS**: Open in Safari > Share > Add to Home Screen

The app is configured as a standalone PWA — it hides the browser UI when launched from the home screen.
