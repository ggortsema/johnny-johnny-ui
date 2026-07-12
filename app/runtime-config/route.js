export const dynamic = "force-dynamic";

function value(name, fallback = "") {
  return (process.env[name] || fallback).trim();
}

export async function GET() {
  const config = {
    auth0Domain: value("AUTH0_DOMAIN"),
    auth0ClientId: value("AUTH0_CLIENT_ID"),
    auth0Audience: value("AUTH0_AUDIENCE"),
    auth0Scope: value(
      "AUTH0_SCOPE",
      "openid profile email invoke:assistant read:backlogs operate:backlogs"
    ),
    apiBaseUrl: value("JOHNNY_JOHNNY_API_BASE_URL", "/api/v1"),
    projectTitle: value(
      "JOHNNY_JOHNNY_PROJECT_TITLE",
      "Johnny-Johnny Backlog Persistence Sandbox"
    ),
    provider: value("JOHNNY_JOHNNY_PROVIDER", "github"),
    providerAccount: value("JOHNNY_JOHNNY_PROVIDER_ACCOUNT", "ggortsema"),
  };

  const missing = [
    ["AUTH0_DOMAIN", config.auth0Domain],
    ["AUTH0_CLIENT_ID", config.auth0ClientId],
    ["AUTH0_AUDIENCE", config.auth0Audience],
  ]
    .filter(([, current]) => !current)
    .map(([name]) => name);

  return Response.json(
    {
      ...config,
      configured: missing.length === 0,
      missing,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
