# Go Outside — IRL Directory

A real-world experience directory powered by Google Places API.

## Deploy to Vercel

### 1. Install Vercel CLI (optional) or use the dashboard

### 2. Set your environment variable
In Vercel dashboard → Your Project → Settings → Environment Variables:

```
Name:  GOOGLE_PLACES_API_KEY
Value: your-google-api-key-here
```

### 3. Deploy
- Drag this folder into vercel.com/new, OR
- Run `vercel deploy` from this directory

### 4. Connect your domain
Vercel dashboard → Your Project → Settings → Domains → Add `irl.directory`
Then in Squarespace DNS, point to Vercel's nameservers.

## Project Structure

```
irl-directory/
├── index.html        ← The main site
├── api/
│   └── places.js     ← Serverless function (hides your API key)
├── vercel.json       ← Vercel config
└── README.md
```

## Adding Hidden Gems
Edit the `HIDDEN_GEMS` array in `index.html` to add curated local picks.
Each gem has: name, category, desc, tags, address.
