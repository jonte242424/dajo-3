/**
 * Authenticated fetch helper + typed API calls
 */
export function authFetch(url, options = {}) {
    const token = localStorage.getItem("token");
    return fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });
}
export async function apiFetch(url, options = {}) {
    const res = await authFetch(url, options);
    const data = await res.json();
    if (!res.ok)
        throw new Error(data.error || "API-fel");
    return data;
}
