import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:3000")
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  // Allow an explicit override when testing on a device or in CI
  const explicit = process.env.API_BASE_URL;
  if (explicit) {
    return explicit.endsWith('/') ? explicit : explicit + '/';
  }

  let host = process.env.EXPO_PUBLIC_DOMAIN;
  const port = process.env.PORT || '5000';

  if (!host) {
    // Fall back to a local dev server. Note: physical devices cannot use 'localhost' to reach your machine —
    // set `API_BASE_URL` to `http://<your-machine-ip>:<port>/` or set EXPO_PUBLIC_DOMAIN accordingly when testing on device.
    const fallback = `http://localhost:${port}/`;
    // eslint-disable-next-line no-console
    console.warn('EXPO_PUBLIC_DOMAIN is not set; falling back to', fallback);
    return fallback;
  }

  // If a scheme is already included, respect it
  if (/^https?:\/\//i.test(host)) {
    return host.endsWith('/') ? host : host + '/';
  }

  // Use http for localhost or when in development, otherwise default to https
  const scheme = host.includes('localhost') || process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const url = `${scheme}://${host}`;

  return url.endsWith('/') ? url : url + '/';
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
