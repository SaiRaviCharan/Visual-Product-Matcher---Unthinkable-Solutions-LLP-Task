export const normalizeImageUrl = (rawUrl: string): string => {
  try {
    const parsed = new URL(rawUrl);

    // Google Images often provides "imgres" wrapper URLs with the actual asset inside the imgurl param.
    if (parsed.hostname.includes('google.') && parsed.pathname.includes('/imgres')) {
      const actualImageUrl = parsed.searchParams.get('imgurl');
      if (actualImageUrl) {
        return normalizeImageUrl(actualImageUrl);
      }
    }

    if (parsed.hostname.includes('images.unsplash.com')) {
      const params = parsed.searchParams;
      if (!params.has('auto')) {
        params.set('auto', 'format');
      }
      if (!params.has('fit')) {
        params.set('fit', 'crop');
      }
      if (!params.has('fm')) {
        params.set('fm', 'jpg');
      }
      parsed.search = params.toString();
      return parsed.toString();
    }
  } catch (error) {
    console.warn('Unable to normalise image URL', rawUrl, error);
  }
  return rawUrl;
};
