import assert from "node:assert/strict";
import test from "node:test";

import { joinApiUrl, normalizeAgentError } from "../lib/agent-api-core.mjs";

test("joins relative and absolute API bases without duplicate slashes", () => {
  assert.equal(joinApiUrl("/api/v1/", "/auth/whoami"), "/api/v1/auth/whoami");
  assert.equal(
    joinApiUrl("https://example.test/api/v1", "assistant/responses"),
    "https://example.test/api/v1/assistant/responses"
  );
});

test("normalizes the Johnny-Johnny error contract", () => {
  assert.deepEqual(
    normalizeAgentError(403, {
      error: {
        code: "insufficient_scope",
        message: "Permission missing.",
        details: { required_scopes: ["operate:backlogs"] },
      },
    }),
    {
      status: 403,
      code: "insufficient_scope",
      message: "Permission missing.",
      details: { required_scopes: ["operate:backlogs"] },
    }
  );
});
