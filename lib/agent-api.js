"use client";

import { useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";

import { useRuntimeConfig } from "@/components/auth/AuthBootstrap";
import { joinApiUrl, normalizeAgentError, readResponseBody } from "@/lib/agent-api-core.mjs";

export class AgentApiError extends Error {
  constructor({ status, code, message, details }) {
    super(message);
    this.name = "AgentApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function useAgentApi() {
  const { getAccessTokenSilently } = useAuth0();
  const config = useRuntimeConfig();

  const request = useCallback(
    async (path, options = {}) => {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: config.auth0Audience,
          scope: config.auth0Scope,
        },
      });

      const headers = new Headers(options.headers || {});
      headers.set("Authorization", `Bearer ${token}`);
      if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      const response = await fetch(joinApiUrl(config.apiBaseUrl, path), {
        ...options,
        headers,
        cache: "no-store",
      });
      const payload = await readResponseBody(response);
      if (!response.ok) {
        throw new AgentApiError(normalizeAgentError(response.status, payload));
      }
      return payload;
    },
    [config.apiBaseUrl, config.auth0Audience, config.auth0Scope, getAccessTokenSilently]
  );

  return { request, config };
}
