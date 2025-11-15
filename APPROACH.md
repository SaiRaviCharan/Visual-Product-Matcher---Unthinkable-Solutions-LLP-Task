# Approach (198 words)

I treated the assignment like a focused product spike: build the simplest end-to-end visual matcher that feels production-ready without over-engineering a backend. Next.js 16 with the App Router covers routing, API needs, and deployment (Vercel-ready) in one stack. Tailwind 4 keeps styling terse while the layout stays responsive from 360 px upward.

For similarity, I avoided heavy ML dependencies to meet the “minimal packages” rule. Instead, the browser’s Canvas API extracts a small embedding (mean RGB, brightness, contrast, saturation). Each catalog product stores a handcrafted embedding that mirrors the same feature space. When the user uploads or links an image, we compute its embedding client-side and run cosine similarity against the preloaded catalog vectors. The slider simply filters the ranked list, so the UI always reacts instantly.

The catalog lives in `public/products.json` with 52 entries (name, category, tags, pricing, imagery, embedding). Keeping it static allowed me to ship a deterministic experience while staying within GitHub’s size expectations. Error boundaries, loading states, and helper text guide the reviewer through every step. The end result fits the brief’s eight-hour expectation, stays deployable on free hosting, and remains easy to extend with a real model or backend later.
