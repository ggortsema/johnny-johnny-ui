export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const forwardedRequestHeaders = [
  "accept",
  "authorization",
  "content-type",
  "if-none-match",
  "x-request-id",
];

const forwardedResponseHeaders = [
  "cache-control",
  "content-type",
  "etag",
  "location",
  "retry-after",
  "www-authenticate",
  "x-request-id",
];

function agentOrigin() {
  const configured = (process.env.JOHNNY_JOHNNY_AGENT_ORIGIN || "http://127.0.0.1:8000").trim();
  const url = new URL(configured);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("JOHNNY_JOHNNY_AGENT_ORIGIN must use http or https.");
  }
  return url;
}

async function forward(request, context) {
  try {
    const { segments = [] } = await context.params;
    const target = new URL(
      `/api/v1/${segments.map((segment) => encodeURIComponent(segment)).join("/")}`,
      agentOrigin()
    );
    target.search = new URL(request.url).search;

    const headers = new Headers();
    for (const name of forwardedRequestHeaders) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }

    const method = request.method.toUpperCase();
    const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();
    const upstream = await fetch(target, {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });

    const responseHeaders = new Headers();
    for (const name of forwardedResponseHeaders) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return Response.json(
      {
        error: {
          code: "agent_proxy_unavailable",
          message: "The Johnny-Johnny agent could not be reached through the local UI proxy.",
          details: process.env.NODE_ENV === "development" ? error.message : null,
        },
      },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const HEAD = forward;
