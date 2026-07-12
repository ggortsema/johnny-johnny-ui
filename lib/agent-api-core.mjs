export function joinApiUrl(baseUrl, path) {
  const normalizedPath = String(path || "").startsWith("/")
    ? String(path || "")
    : `/${String(path || "")}`;
  const normalizedBase = String(baseUrl || "").replace(/\/$/, "");
  return `${normalizedBase}${normalizedPath}` || normalizedPath;
}

export async function readResponseBody(response) {
  const raw = await response.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function normalizeAgentError(status, payload) {
  if (payload && typeof payload === "object" && payload.error) {
    return {
      status,
      code: payload.error.code || "agent_request_failed",
      message: payload.error.message || `Agent request failed with HTTP ${status}.`,
      details: payload.error.details ?? null,
    };
  }

  return {
    status,
    code: "agent_request_failed",
    message:
      typeof payload === "string" && payload.trim()
        ? payload.trim()
        : `Agent request failed with HTTP ${status}.`,
    details: null,
  };
}
