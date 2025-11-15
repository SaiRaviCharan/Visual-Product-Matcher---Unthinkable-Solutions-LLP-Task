# Visual Product Matcher

Visual Product Matcher is a lightweight visual search demo. Users can upload an image (or provide a URL) and get similar catalog items in seconds. The entire stack runs on the client, making it easier to deploy on any static-friendly host such as Vercel.

Live demo: [visual-product-matcher-unthinkable.vercel.app](https://visual-product-matcher-unthinkable.vercel.app/)

## Highlights

- Next.js App Router + TypeScript + Tailwind CSS 4
- 52 curated catalog items with imagery, metadata, and handcrafted embeddings
- Canvas-based feature extraction (mean RGB, brightness, contrast, saturation)
- Cosine-similarity ranking with adjustable thresholds
- Loading states, error messaging, and fully responsive layout

## Approach (≤200 words)

Built Visual Product Matcher as a client-first sandbox that runs everywhere without provisioning servers. I started by mapping the UX requirements (upload + URL ingest, adjustable threshold, responsive hero/cards) and produced a mock matching the provided dark glass design. Catalog coverage comes from 56 Unsplash-backed entries in `public/products.json`, each annotated with metadata and precomputed embeddings so the app can work offline. The similarity engine uses a lightweight canvas histogram embedding and cosine ranking, giving sub-second results and avoiding heavy TensorFlow downloads. To keep URL uploads reliable, I added a Next.js route that proxies remote images, enforces safe headers, and returns CORS-friendly blobs; it falls back gracefully when a host blocks CORS outright. Styling leans on Tailwind 4 utility tokens plus a few custom classes for glow borders, motion, and radial backgrounds. Everything runs through ESLint, TypeScript, and `next build`, so reviewers can clone, `npm install`, and ship immediately.

## Tech Stack

| Layer | Tools |
| --- | --- |
| UI | Next.js 16, React 19, App Router |
| Styling | Tailwind CSS 4, custom gradients |
| Data | Static `public/products.json` (52 entries) |
| Similarity | Canvas feature extractor + cosine similarity |
| Hosting | Designed for Vercel / any Node 18+ platform |

## Getting Started

Pre-req: Node 18+. Then install dependencies and start the dev server.

```powershell
npm install
npm run dev
```

Visit `http://localhost:3000`, upload an image (or paste a URL), and adjust the similarity slider to filter matches.

## Production Build & Linting

```powershell
npm run lint
npm run build
npm start
```

## Deployment

1. Push the repository to GitHub (branch `main`).
2. In Vercel, “Import Project” → pick the repo → accept defaults.
3. Vercel will run `npm install && npm run build` and expose the live URL.

## Project Structure

```text
visual-product-matcher/
├── app/
│   ├── layout.tsx          # Root layout + metadata
│   ├── page.tsx            # Visual matcher UI
│   └── globals.css         # Tailwind + global tokens
├── lib/
│   └── imageMatching.ts   # Canvas embedding + similarity helpers
├── public/
│   └── products.json      # Catalog with metadata + embeddings
├── README.md
└── APPROACH.md            # <200 word write-up for submissions
```

## Notes

- Catalog images rely on open Unsplash assets for demo purposes.
- Only essential dependencies are included to keep the submission lean.
- See `APPROACH.md` for the 200-word summary requested in the brief.
