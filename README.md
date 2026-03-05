# ⚔ PoE League Wishlist

A shareable wishlist for your Path of Exile private league. Friends open a link, enter their name, and add items they need. Everyone sees everything in real time — no accounts needed.

**Stack:** Static HTML/CSS/JS + Supabase (free tier) for storage & realtime sync.  
**Hosting:** GitHub Pages, Netlify, or any static host.

---

## Quick Setup (5 minutes)

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **New Project**, pick a name and password, choose a region close to you
3. Wait for the project to spin up (~30 seconds)

### 2. Create the Database Table

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Paste the entire contents of `setup.sql` from this repo
4. Click **Run** — you should see "Success" for all statements

### 3. Enable Anonymous Access

1. Go to **Authentication** → **Providers**
2. Make sure **Anonymous Sign-Ins** is **enabled** (should be by default for the anon key)
3. No other auth setup needed — the anon key allows public read/write through RLS policies

### 4. Get Your API Keys

1. Go to **Settings** → **API**
2. Copy your **Project URL** (looks like `https://abcdefg.supabase.co`)
3. Copy your **anon / public** key (the long `eyJ...` string)

### 5. Configure the App

Edit `js/config.js`:

```js
const CONFIG = {
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOi...',
  LEAGUE_NAME: 'Dawn of the Hunt',       // Display name
  LEAGUE_ID: 'dawn-of-the-hunt-3.27',    // Internal ID, change each league
};
```

### 6. Deploy

**GitHub Pages:**
1. Push this repo to GitHub
2. Go to **Settings** → **Pages**
3. Set source to your main branch, root folder
4. Your site is live at `https://yourusername.github.io/PLeagueWishList/`

**Netlify (alternative):**
1. Drag & drop the project folder onto [app.netlify.com/drop](https://app.netlify.com/drop)
2. Done — instant URL

### 7. Share the Link

Send the URL to your friends. They open it, type their name, and start adding wishes. Everything syncs in real time.

---

## New League Season

When a new league starts:

1. Change `LEAGUE_NAME` and `LEAGUE_ID` in `js/config.js`
2. Redeploy

Old data stays in the database but won't show up. Clean slate, no cleanup needed.

If you want to delete old data:
```sql
DELETE FROM wishes WHERE league = 'old-league-id';
```

---

## Customization

### Categories

Edit `js/categories.js` to add, remove, or reorder item categories. Each category has:
- `id` — internal identifier
- `name` — display name
- `icon` — emoji shown in the UI
- `color` — badge border/text color

### Styling

All styles are in `css/style.css` using CSS variables at the top. Easy to change colors, fonts, spacing.

---

## Features

- **Real-time sync** — changes appear instantly for everyone via Supabase Realtime
- **No accounts** — players just enter a name, stored in localStorage
- **Priority levels** — High / Normal / Low with visual indicators
- **Filtering** — search, filter by category/player/priority, hide fulfilled items
- **Grouping** — group the overview by player or category
- **Mark as found** — anyone can mark items as found, shows who found it
- **Responsive** — works on desktop, tablet, and mobile
- **Reusable** — change the league ID each season for a fresh start
- **PoE themed** — dark UI with gold accents inspired by Path of Exile
