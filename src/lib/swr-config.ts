import useSWR, { SWRConfiguration } from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/** Default SWR config: dedupe, revalidate on focus, stale-while-revalidate */
export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 2000, // dedupe requests within 2s
  errorRetryCount: 2,
};

/**
 * Typed wrapper around useSWR for consistent API usage.
 * Returns `{ data, error, isLoading }` with JSON parsed data.
 */
export function useAPI<T = unknown>(url: string | null, config?: SWRConfiguration) {
  return useSWR<T>(url, fetcher, { ...swrConfig, ...config });
}

/** Build a URL with query params for SWR key */
export function apiUrl(path: string, params?: Record<string, string>): string {
  const url = new URL(path, "http://localhost");
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }
  return url.pathname + url.search;
}

export { fetcher };
