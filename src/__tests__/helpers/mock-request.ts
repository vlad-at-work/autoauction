/**
 * Helper to build a Next.js-compatible Request for route handler tests.
 */
export function makeJsonRequest({
  method = 'POST',
  url = 'http://localhost/api/test',
  body,
  headers = {},
}: {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
}): Request {
  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
