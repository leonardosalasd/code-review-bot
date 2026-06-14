// Simple glob matching — supports * and ** without pulling in a full library.
export function minimatch(filepath: string, pattern: string): boolean {
  // Direct extension match like "*.lock"
  if (pattern.startsWith('*.')) {
    const ext = pattern.slice(1);
    return filepath.endsWith(ext);
  }

  // Exact filename match (e.g. "pnpm-lock.yaml")
  if (!pattern.includes('*')) {
    const basename = filepath.split('/').pop() ?? filepath;
    return basename === pattern || filepath === pattern;
  }

  // Convert glob to regex for anything more complex
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*');

  return new RegExp(`^${escaped}$`).test(filepath);
}

// Splits a large diff into smaller chunks so we don't blow up the
// model's context window.
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
