import type { AnalyzerResult } from '@ytp/types';
import { apiFetch } from '@/lib/api-client.js';

export async function analyzeUrl(url: string): Promise<AnalyzerResult> {
  return apiFetch<AnalyzerResult>('/api/v1/analyzer', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}
