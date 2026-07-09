export function getOptimizedImageUrl(url: string | null | undefined, width: number, height: number): string | null {
  if (!url) return null;
  if (!url.includes('cloudinary')) return url;
  return url.replace('/upload/', `/upload/w_${width},h_${height},c_fill,f_auto,q_auto/`);
}
