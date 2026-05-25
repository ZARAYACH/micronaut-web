export function optimizeImages(input: any): any {
  return input.replace(/<img\b[^>]*>/gi, (tag: any): any => {
    let optimized = tag;
    if (!/\bloading\s*=/i.test(optimized)) {
      optimized = optimized.replace(/<img\b/i, '<img loading="lazy"');
    }
    if (!/\bdecoding\s*=/i.test(optimized)) {
      optimized = optimized.replace(/<img\b/i, '<img decoding="async"');
    }
    return optimized;
  });
}
