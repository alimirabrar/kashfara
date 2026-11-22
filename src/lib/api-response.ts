/**
 * Parse an API response without throwing when the platform returns a
 * non-JSON body (e.g. an HTML 504 gateway-timeout page from Vercel).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parseApiResponse<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: `Server error (HTTP ${res.status}).` } as T;
  }
}
