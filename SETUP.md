# Setting up AI Spine Art

Two steps: deploy the Worker, then connect it to your bookshelf.

---

## Step 1 — Deploy worker.js to Cloudflare

1. Go to **dash.cloudflare.com** and sign up for a free account (no credit card needed)

2. In the sidebar go to **Workers & Pages** → **Create** → **Create Worker**

3. Click **Edit code**, delete the placeholder, and paste the entire contents of `worker.js`

4. Click **Deploy**

5. You'll get a URL like:
   ```
   https://bookshelf-ai.YOUR-NAME.workers.dev
   ```
   Copy it.

6. **Enable Workers AI** on your account:
   - Sidebar → **AI** → **Workers AI**
   - Click **Enable** (free tier: 10,000 requests/day)

7. **Bind the AI model to your Worker**:
   - Go back to your Worker → **Settings** → **Bindings**
   - Click **Add** → **Workers AI**
   - Set the variable name to exactly: `AI`
   - Click **Save and deploy**

---

## Step 2 — Connect to your bookshelf

1. Open `index.html` in your browser
2. Click the **+** button on any shelf to open the Add Book form
3. Paste your Worker URL into the **Setup AI Spine Art** box
4. Click **Connect** — the banner turns green

That's it. Now when you add or edit a book, click **✨ Generate spine art** and it will call your Worker, run Flux on Cloudflare's GPU, and paint the result onto the spine.

---

## How it works

```
Your browser  →  POST /  →  Cloudflare Worker  →  Workers AI (Flux-1-schnell)
                  { title, author, genre, color }        returns PNG image
```

The Worker builds a prompt from your book's metadata and genre, calls
`@cf/black-forest-labs/flux-1-schnell` at 128×512px (spine proportions),
and streams the PNG back to your page.

The image is saved as a base64 string in localStorage alongside the book data,
so it persists across page reloads without any backend.

---

## Costs

| Tier | Price |
|------|-------|
| Free | 10,000 neurons/day (~100–200 images) |
| Paid | $0.011 per 1,000 neurons |

One 128×512 Flux image at 8 steps costs ~50 neurons ≈ **$0.00055**.
You'd need to generate ~18,000 images to spend $10.

---

## Troubleshooting

**"Error: AI binding not found"** — you forgot Step 1.7. Add the `AI` binding in Worker Settings.

**CORS error in browser** — make sure you're opening the HTML from a server (GitHub Pages), not double-clicking the file locally. Or add your local origin to the Worker's CORS list.

**Image is landscape not portrait** — the Worker requests 128×512. If your Cloudflare plan overrides this, you can swap to `width:256, height:768` in worker.js.
