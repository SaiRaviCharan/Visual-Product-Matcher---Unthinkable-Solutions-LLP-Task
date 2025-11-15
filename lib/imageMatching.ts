export interface CatalogEmbedding {
  id: number;
  embedding: number[];
}

export interface SimilarityScore {
  id: number;
  similarity: number;
}

const CANVAS_SIZE = 48;

const createCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas context not available in this browser');
  }
  return context;
};

export const getImageEmbedding = (image: HTMLImageElement): number[] => {
  const ctx = createCanvas();
  ctx.drawImage(image, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
  const { data } = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const pixelCount = CANVAS_SIZE * CANVAS_SIZE;
  let redTotal = 0;
  let greenTotal = 0;
  let blueTotal = 0;
  let brightnessTotal = 0;
  let brightnessSquares = 0;
  let saturationTotal = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    redTotal += r;
    greenTotal += g;
    blueTotal += b;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const brightness = (r + g + b) / (3 * 255);
    const saturation = max === 0 ? 0 : (max - min) / max;

    brightnessTotal += brightness;
    brightnessSquares += brightness * brightness;
    saturationTotal += saturation;
  }

  const avgBrightness = brightnessTotal / pixelCount;
  const brightnessVariance = brightnessSquares / pixelCount - avgBrightness * avgBrightness;
  const contrast = Math.sqrt(Math.max(brightnessVariance, 0));
  const avgSaturation = saturationTotal / pixelCount;

  return normalizeVector([
    redTotal / (pixelCount * 255),
    greenTotal / (pixelCount * 255),
    blueTotal / (pixelCount * 255),
    avgBrightness,
    contrast,
    avgSaturation,
  ]);
};

const normalizeVector = (vector: number[]) => {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!Number.isFinite(magnitude) || magnitude === 0) {
    return vector.map(() => 0);
  }
  return vector.map((value) => value / magnitude);
};

const cosineSimilarity = (a: number[], b: number[]) => {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dot / Math.sqrt(magA * magB);
};

export const findSimilarProducts = async (
  sourceImage: HTMLImageElement,
  catalogEmbeddings: CatalogEmbedding[],
  topK = 12,
): Promise<SimilarityScore[]> => {
  const imageEmbedding = getImageEmbedding(sourceImage);

  return catalogEmbeddings
    .map((entry) => ({
      id: entry.id,
      similarity: Math.max(0, cosineSimilarity(imageEmbedding, normalizeVector(entry.embedding)) * 100),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
};
