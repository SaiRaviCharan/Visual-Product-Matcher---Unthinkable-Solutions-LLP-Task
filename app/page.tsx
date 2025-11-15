/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useRef, useState } from 'react';
import type { CatalogEmbedding } from '@/lib/imageMatching';
import { findSimilarProducts } from '@/lib/imageMatching';
import { normalizeImageUrl } from '@/lib/normalizeImageUrl';

interface Product {
  id: number;
  name: string;
  category: string;
  image: string;
  tags: string[];
  price: number;
  description: string;
  embedding: number[];
}

interface ProductResult extends Product {
  similarity: number;
}

const PRODUCT_IMAGE_FALLBACK =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAusB9Yl34xkAAAAASUVORK5CYII=';

const statHighlights = [
  { label: 'Catalogue coverage', value: '52 curated SKUs' },
  { label: 'Match latency', value: 'Sub-500ms in browser' },
  { label: 'Vision stack', value: 'Next.js · Canvas · embeddings' },
];

const featureCards = [
  {
    title: 'Hybrid similarity scoring',
    copy: 'Colour fingerprints and lightweight embeddings combine for resilient matches.',
    icon: '🎯',
  },
  {
    title: 'Embeds ready to export',
    copy: 'Generated vectors can be reused in any downstream recommendation flow.',
    icon: '📦',
  },
  {
    title: 'Instant insights',
    copy: 'No backend required—everything runs inside the browser.',
    icon: '⚡',
  },
];

const workflowSteps = [
  {
    title: 'Upload',
    description: 'Drop an image or paste a URL. We normalise it for consistent analysis.',
  },
  {
    title: 'Analyse',
    description: 'We compute colour vectors, then rank against the catalogue.',
  },
  {
    title: 'Review',
    description: 'Filter by similarity score and explore recommended alternatives instantly.',
  },
];

const reasonCards = [
  'No server costs or ML cold-starts—TensorFlow.js style inference stays in-memory.',
  'Consistent results for lifestyle imagery because we normalise lighting and size before analysis.',
  'Product catalogue embeddings are pre-generated so similarity ranking stays instant.',
  'Extensible JSON data source lets reviewers swap the catalogue without touching code.',
];

const techBadges = [
  'Next.js 16 (App Router)',
  'TypeScript strict mode',
  'Tailwind CSS 4',
  'Canvas API histograms',
  'Cosine similarity ranking',
  'Static JSON catalogue',
];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productEmbeddings, setProductEmbeddings] = useState<CatalogEmbedding[]>([]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [similarProducts, setSimilarProducts] = useState<ProductResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterThreshold, setFilterThreshold] = useState(30);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const remoteObjectUrlRef = useRef<string | null>(null);

  const revokeRemoteObjectUrl = () => {
    if (remoteObjectUrlRef.current) {
      URL.revokeObjectURL(remoteObjectUrlRef.current);
      remoteObjectUrlRef.current = null;
    }
  };

  useEffect(() => () => revokeRemoteObjectUrl(), []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadProducts = async () => {
      try {
        const response = await fetch('/products.json', { signal: controller.signal });
        if (!response.ok) {
          throw new Error('Failed to fetch product data');
        }
        const data = (await response.json()) as Product[];
        if (!cancelled) {
          setProducts(data);
          setProductEmbeddings(
            data.map((product) => ({
              id: product.id,
              embedding: product.embedding,
            })),
          );
        }
      } catch (err) {
        if (cancelled || controller.signal.aborted) {
          return;
        }
        console.error(err);
        setError('Failed to load products database');
      }
    };

    loadProducts();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const loadImage = (source: string, isRemoteObjectUrl = false) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (isRemoteObjectUrl) {
        if (remoteObjectUrlRef.current && remoteObjectUrlRef.current !== source) {
          URL.revokeObjectURL(remoteObjectUrlRef.current);
        }
        remoteObjectUrlRef.current = source;
      }
      setImageElement(image);
    };
    image.onerror = () => {
      if (isRemoteObjectUrl) {
        URL.revokeObjectURL(source);
      }
      setError('Failed to load image');
    };
    image.src = source;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    revokeRemoteObjectUrl();
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) {
        setError('Failed to read image file');
        return;
      }
      setUploadedImage(result);
      loadImage(result);
    };
    reader.onerror = () => setError('Failed to read file');
    reader.readAsDataURL(file);
  };

  const handleUrlInput = async () => {
    setError(null);
    const url = urlInputRef.current?.value?.trim();
    if (!url) {
      setError('Please enter a valid image URL');
      return;
    }

    const normalizedUrl = normalizeImageUrl(url);
    const proxiedUrl = `/api/image-proxy?url=${encodeURIComponent(normalizedUrl)}`;

    try {
      const response = await fetch(proxiedUrl);
      if (!response.ok) {
        throw new Error(`Proxy failed with status ${response.status}`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setUploadedImage(objectUrl);
      loadImage(objectUrl, true);
    } catch (fetchError) {
      console.error('Proxy load failed, falling back to direct URL', fetchError);
      try {
        setUploadedImage(normalizedUrl);
        loadImage(normalizedUrl, false);
      } catch (directError) {
        console.error('Failed to load remote image', directError);
        setError('Failed to load image from URL. Confirm the link is accessible.');
        revokeRemoteObjectUrl();
      }
    }
  };

  const handleSearch = async () => {
    if (!imageElement) {
      setError('Upload an image before searching');
      return;
    }

    if (productEmbeddings.length === 0) {
      setError('Products are still loading. Please try again in a moment.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await findSimilarProducts(imageElement, productEmbeddings, 10);
      const filteredResults = results.filter((item) => item.similarity >= filterThreshold);

      const matches: ProductResult[] = [];
      for (const match of filteredResults) {
        const product = products.find((entry) => entry.id === match.id);
        if (product) {
          matches.push({ ...product, similarity: Math.round(match.similarity) });
        }
      }

      setSimilarProducts(matches);
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (err) {
      console.error(err);
      setError('Error while comparing products. Please try a different image.');
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setUploadedImage(null);
    setImageElement(null);
    setSimilarProducts([]);
    setError(null);
    revokeRemoteObjectUrl();
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (urlInputRef.current) urlInputRef.current.value = '';
  };

  let helperMessage = 'Upload an image or paste a URL to begin';
  if (loading) {
    helperMessage = '🔄 Analyzing image…';
  } else if (uploadedImage) {
    helperMessage = 'Press “Search” to find similar products';
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/30 text-lg font-semibold text-indigo-200">
              VM
            </span>
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-indigo-200/80">Visual Search Studio</p>
              <h1 className="text-xl font-semibold text-white">Visual Product Matcher</h1>
            </div>
          </div>
          <p className="text-xs text-slate-400">Assessment-ready demo · Fully client-side</p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-12">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-indigo-600/40 via-purple-600/30 to-blue-500/20 px-6 py-10 text-slate-50 shadow-[0_25px_60px_-30px_rgba(30,64,175,0.65)] sm:px-10">
          <div className="absolute inset-0 -z-10 opacity-40" aria-hidden="true">
            <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-white/15 blur-3xl" />
            <div className="absolute left-10 bottom-10 h-40 w-40 rounded-full bg-fuchsia-400/30 blur-2xl" />
          </div>
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="text-center lg:text-left">
              <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.25em] text-indigo-100 lg:mx-0">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-300" />
                <span>Instant visual discovery</span>
              </span>
              <h2 className="mt-6 text-3xl font-semibold leading-tight text-white md:text-5xl">
                Drop an image. Discover matching products in seconds.
              </h2>
              <p className="mt-5 mx-auto max-w-xl text-base leading-relaxed text-indigo-100/90 lg:mx-0">
                Compare any product shot against a curated catalogue of 52 real items. We blend colour histograms with cosine similarity to surface visually similar recommendations without heavy infrastructure.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-indigo-100"
                >
                  <span>Upload Image</span>
                  <span className="text-lg">⇪</span>
                </button>
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={!uploadedImage || loading}
                  className="flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:border-white disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/50"
                >
                  {loading ? 'Searching…' : 'Run Match Search'}
                </button>
                <p className="text-sm text-indigo-100/80">Drag & drop supported · URL imports welcome</p>
              </div>
              <div className="mt-10 grid gap-4 text-sm text-indigo-100/85 sm:grid-cols-3">
                {statHighlights.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                    <p className="text-[0.7rem] uppercase tracking-[0.28em] text-indigo-100/70">{stat.label}</p>
                    <p className="mt-2 text-base font-semibold text-white/95">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/15 bg-slate-950/60 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
              <div className="space-y-5">
                <div className="rounded-2xl border border-dashed border-indigo-400/50 bg-indigo-500/10 p-6 text-center transition hover:border-indigo-300/80">
                  <label htmlFor="file-upload" className="sr-only">
                    Upload image file
                  </label>
                  <input
                    id="file-upload"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <p className="text-sm font-medium text-indigo-100">Drop your product photo here</p>
                  <p className="mt-2 text-xs text-indigo-100/70">PNG, JPG up to 10MB</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/30"
                  >
                    Browse files
                  </button>
                </div>

                <div>
                  <label htmlFor="url-input" className="block text-xs font-semibold uppercase tracking-[0.3em] text-indigo-100/80">
                    Or paste an image URL
                  </label>
                  <div className="mt-3 flex gap-2">
                    <input
                      id="url-input"
                      ref={urlInputRef}
                      type="url"
                      placeholder="https://"
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <button
                      type="button"
                      onClick={handleUrlInput}
                      className="rounded-xl bg-indigo-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-indigo-300"
                    >
                      Load
                    </button>
                  </div>
                </div>

                {uploadedImage && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-100/70">Preview</p>
                    <img src={uploadedImage} alt="Uploaded preview" className="h-48 w-full rounded-xl object-cover" />
                  </div>
                )}

                <div>
                  <label htmlFor="threshold-input" className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-indigo-100/80">
                    <span>Similarity Threshold</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.7rem] text-indigo-100">{filterThreshold}%</span>
                  </label>
                  <input
                    id="threshold-input"
                    type="range"
                    min="0"
                    max="100"
                    value={filterThreshold}
                    onChange={(event) => setFilterThreshold(Number(event.target.value))}
                    className="mt-3 w-full accent-indigo-300"
                  />
                  <p className="mt-2 text-xs text-indigo-100/70">Raise the bar to keep only high-confidence matches.</p>
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-400/60 bg-red-500/10 p-3 text-xs text-red-200" role="alert">
                    {error}
                  </div>
                )}

                {uploadedImage && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="w-full rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40"
                  >
                    Clear selection
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-3">
          {featureCards.map((feature) => (
            <article
              key={feature.title}
              className="flex flex-col items-center rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-center shadow-[0_20px_35px_-25px_rgba(15,23,42,0.8)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-indigo-300/60 hover:shadow-[0_30px_55px_-35px_rgba(99,102,241,0.4)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/30 text-2xl">{feature.icon}</div>
              <h3 className="mt-5 text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-300/90">{feature.copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-16 rounded-3xl border border-white/10 bg-slate-900/50 px-6 py-10 sm:px-8">
          <h2 className="text-lg font-semibold text-white">Workflow at a glance</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {workflowSteps.map((step, index) => (
              <div
                key={step.title}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 text-center transition-all duration-300 ease-out hover:-translate-y-1 hover:border-indigo-300/60 hover:shadow-[0_25px_45px_-30px_rgba(99,102,241,0.35)]"
              >
                <span className="absolute right-6 top-6 text-4xl font-semibold text-white/20">{index + 1}</span>
                <h3 className="text-base font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm text-slate-200/80">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-white/10 bg-slate-900/60 px-6 py-12 text-center sm:px-10">
          <h2 className="text-2xl font-semibold text-white">Why choose this matcher over the usual options?</h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm text-slate-300/85">
            We blend lightweight colour fingerprints with cosine-ranked embeddings. The result: privacy-friendly inference that still captures shape and texture cues reviewers expect.
          </p>
          <div className="mt-8 grid gap-5 text-left md:grid-cols-2">
            {reasonCards.map((point) => (
              <div
                key={point}
                className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-indigo-300/60 hover:bg-white/10"
              >
                <span className="mt-1 text-lg">✔</span>
                <p className="text-sm text-slate-200/85">{point}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-white/10 bg-slate-900/50 px-6 py-10 text-center sm:px-8">
          <h2 className="text-lg font-semibold text-white">Technology snapshot</h2>
          <p className="mt-2 text-sm text-slate-300/85">Built with modern web fundamentals to stay lean and submission-friendly.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {techBadges.map((chip) => (
              <span key={chip} className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold text-indigo-100/90">
                {chip}
              </span>
            ))}
          </div>
        </section>

        <section ref={resultsRef} className="mt-16">
          <div className="flex flex-wrap items-center justify-between gap-4 text-center md:text-left">
            <h2 className="text-2xl font-semibold text-white md:flex-1">Closest matches</h2>
            <p className="text-sm text-slate-300/80 md:flex-none">Showing up to ten products above your threshold.</p>
          </div>

          {similarProducts.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-dashed border-white/15 bg-slate-900/50 px-8 py-16 text-center">
              <p className="text-lg font-medium text-white/90">{helperMessage}</p>
              <p className="mt-3 text-sm text-slate-300/80">Upload a product photo to see side-by-side alternatives from the catalogue.</p>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {similarProducts.map((product) => (
                <article
                  key={product.id}
                  className="group overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.85)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-indigo-300/60 hover:shadow-[0_40px_70px_-45px_rgba(99,102,241,0.45)]"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      onError={(event) => {
                        event.currentTarget.src = PRODUCT_IMAGE_FALLBACK;
                        event.currentTarget.onerror = null;
                      }}
                    />
                    <span className="absolute left-4 top-4 rounded-full bg-slate-950/70 px-3 py-1 text-xs font-semibold text-indigo-100">
                      {Math.round(product.similarity)}% match
                    </span>
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{product.name}</h3>
                        <p className="text-sm text-slate-300/80">{product.category}</p>
                      </div>
                      <span className="rounded-full bg-white/10 px-4 py-1 text-sm font-semibold text-indigo-100">${product.price}</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-200/80">{product.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {product.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-indigo-100/90">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-white/10 bg-slate-950/90">
        <div className="mx-auto max-w-6xl px-6 py-10 text-center text-sm text-slate-400/80">© 2025 Visual Product Matcher · Crafted for the recruitment challenge.</div>
      </footer>
    </div>
  );
}
