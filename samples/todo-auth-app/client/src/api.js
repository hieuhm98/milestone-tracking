// Every call from the frontend to the backend goes through this one function.
// The login cookie is sent automatically: the browser attaches it to every
// request to the same site. Our code never touches the token.

export async function api(method, path, body) {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  // 204 No Content has no body to read.
  const data = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.error ?? `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return data;
}
