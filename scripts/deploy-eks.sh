#!/usr/bin/env bash

set -Eeuo pipefail
set +x

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

AWS_REGION="${AWS_REGION:-us-east-1}"
EKS_CLUSTER="${EKS_CLUSTER:-johnny-johnny-dev}"
NAMESPACE="${NAMESPACE:-johnny-johnny}"
APP_NAME="${APP_NAME:-johnny-johnny-ui}"
ECR_REPOSITORY="${ECR_REPOSITORY:-johnny-johnny/johnny-johnny-ui}"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://johnny-johnny.mycroftai.org}"

AUTH0_DOMAIN="${AUTH0_DOMAIN:-dev-ude3gljkecu7ylzt.us.auth0.com}"
AUTH0_CLIENT_ID="${AUTH0_CLIENT_ID:-}"
AUTH0_AUDIENCE="${AUTH0_AUDIENCE:-https://johnny-johnny.mycroftai.org}"
AUTH0_SCOPE="${AUTH0_SCOPE:-openid profile email invoke:assistant read:backlogs operate:backlogs}"
API_BASE_URL="${JOHNNY_JOHNNY_API_BASE_URL:-/api/v1}"
PROJECT_TITLE="${JOHNNY_JOHNNY_PROJECT_TITLE:-Johnny-Johnny Backlog Persistence Sandbox}"
PROVIDER="${JOHNNY_JOHNNY_PROVIDER:-github}"
PROVIDER_ACCOUNT="${JOHNNY_JOHNNY_PROVIDER_ACCOUNT:-ggortsema}"

AGENT_REPO_DIR="${JOHNNY_JOHNNY_AGENT_DIR:-${ROOT_DIR}/../johnny-johnny-agent}"
MANIFEST_DIR="${MANIFEST_DIR:-${ROOT_DIR}/docs/deployment/eks/kubernetes}"
READINESS_TIMEOUT_SECONDS="${READINESS_TIMEOUT_SECONDS:-240}"
PUBLIC_SMOKE_TIMEOUT_SECONDS="${PUBLIC_SMOKE_TIMEOUT_SECONDS:-240}"

require_command() {
  local command_name="$1"
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "Required command is not installed or not on PATH: ${command_name}" >&2
    exit 1
  fi
}

require_file() {
  local file_path="$1"
  if [[ ! -f "${file_path}" ]]; then
    echo "Required file does not exist: ${file_path}" >&2
    exit 1
  fi
}

print_step() {
  printf '\n==> %s\n' "$1"
}

for command_name in aws curl docker kubectl node npm python3 tar; do
  require_command "${command_name}"
done

if [[ -z "${AUTH0_CLIENT_ID}" ]]; then
  echo "AUTH0_CLIENT_ID is required and must identify an Auth0 Single Page Application." >&2
  echo "No Auth0 client secret is used or accepted by this deployment." >&2
  exit 1
fi

if [[ ! -d "${AGENT_REPO_DIR}/docs/architecture/adrs" ]]; then
  echo "Johnny-Johnny agent ADRs were not found at: ${AGENT_REPO_DIR}/docs/architecture/adrs" >&2
  echo "Set JOHNNY_JOHNNY_AGENT_DIR to the canonical agent repository." >&2
  exit 1
fi

NAMESPACE_MANIFEST="${MANIFEST_DIR}/johnny-johnny-namespace.yml"
SERVICE_MANIFEST="${MANIFEST_DIR}/johnny-johnny-ui-service.yml"
DEPLOYMENT_MANIFEST="${MANIFEST_DIR}/johnny-johnny-ui-deployment.yml"
LOCAL_INGRESS_MANIFEST="${MANIFEST_DIR}/johnny-johnny-shared-ingress.yml"
AGENT_INGRESS_MANIFEST="${AGENT_REPO_DIR}/docs/deployment/eks/kubernetes/johnny-johnny-ingress.yml"
INGRESS_MANIFEST="${AGENT_INGRESS_MANIFEST}"
if [[ ! -f "${INGRESS_MANIFEST}" ]]; then
  INGRESS_MANIFEST="${LOCAL_INGRESS_MANIFEST}"
fi

for manifest in \
  "${NAMESPACE_MANIFEST}" \
  "${SERVICE_MANIFEST}" \
  "${DEPLOYMENT_MANIFEST}" \
  "${INGRESS_MANIFEST}"
do
  require_file "${manifest}"
done

PROJECT_VERSION="$(node -p "require('./package.json').version")"
if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  GIT_SHA="$(git rev-parse --short=12 HEAD)"
else
  GIT_SHA="nogit"
fi
UTC_TIMESTAMP="$(date -u +%Y%m%d%H%M%S)"
IMAGE_TAG="${IMAGE_TAG:-${PROJECT_VERSION}-${GIT_SHA}-${UTC_TIMESTAMP}}"

TEMP_DIR="$(mktemp -d)"
BUILD_CONTEXT="${TEMP_DIR}/build-context"
RENDERED_DEPLOYMENT="${TEMP_DIR}/johnny-johnny-ui-deployment.yml"
HTTP_BODY="${TEMP_DIR}/http-response-body.txt"

cleanup() {
  rm -rf "${TEMP_DIR}"
}
trap cleanup EXIT

print_step "Install exact dependencies and verify the UI"
npm ci
JOHNNY_JOHNNY_AGENT_DOCS_DIR="${AGENT_REPO_DIR}/docs" npm test
JOHNNY_JOHNNY_AGENT_DOCS_DIR="${AGENT_REPO_DIR}/docs" npm run build

print_step "Refresh EKS kubeconfig and resolve AWS account"
aws eks update-kubeconfig \
  --name "${EKS_CLUSTER}" \
  --region "${AWS_REGION}" \
  >/dev/null
AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_URI="${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"

echo "Image: ${IMAGE_URI}"
echo "Cluster: ${EKS_CLUSTER}"
echo "Namespace: ${NAMESPACE}"
echo "Public origin: ${PUBLIC_BASE_URL}"

print_step "Ensure the ECR repository exists"
if ! aws ecr describe-repositories \
  --repository-names "${ECR_REPOSITORY}" \
  --region "${AWS_REGION}" \
  >/dev/null 2>&1; then
  aws ecr create-repository \
    --repository-name "${ECR_REPOSITORY}" \
    --image-scanning-configuration scanOnPush=true \
    --region "${AWS_REGION}" \
    >/dev/null
fi

print_step "Stage a reproducible build context with canonical agent ADRs"
mkdir -p "${BUILD_CONTEXT}"
tar \
  --exclude='./.git' \
  --exclude='./.next' \
  --exclude='./node_modules' \
  --exclude='./.env' \
  --exclude='./.env.*' \
  --exclude='./*.zip' \
  -cf - . \
  | tar -xf - -C "${BUILD_CONTEXT}"
mkdir -p "${BUILD_CONTEXT}/.agent-docs"
cp -R "${AGENT_REPO_DIR}/docs/." "${BUILD_CONTEXT}/.agent-docs/"

print_step "Authenticate Docker to ECR"
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

print_step "Build and push the linux/amd64 image"
docker buildx build \
  --platform linux/amd64 \
  --tag "${IMAGE_URI}" \
  --push \
  "${BUILD_CONTEXT}"

print_step "Render runtime-only public configuration"
SOURCE_DEPLOYMENT="${DEPLOYMENT_MANIFEST}" \
TARGET_DEPLOYMENT="${RENDERED_DEPLOYMENT}" \
IMAGE_URI="${IMAGE_URI}" \
AUTH0_DOMAIN="${AUTH0_DOMAIN}" \
AUTH0_CLIENT_ID="${AUTH0_CLIENT_ID}" \
AUTH0_AUDIENCE="${AUTH0_AUDIENCE}" \
AUTH0_SCOPE="${AUTH0_SCOPE}" \
API_BASE_URL="${API_BASE_URL}" \
PROJECT_TITLE="${PROJECT_TITLE}" \
PROVIDER="${PROVIDER}" \
PROVIDER_ACCOUNT="${PROVIDER_ACCOUNT}" \
python3 - <<'PY'
import json
import os
from pathlib import Path

source = Path(os.environ["SOURCE_DEPLOYMENT"])
target = Path(os.environ["TARGET_DEPLOYMENT"])
replacements = {
    "__IMAGE_URI__": os.environ["IMAGE_URI"],
    "__AUTH0_DOMAIN__": os.environ["AUTH0_DOMAIN"],
    "__AUTH0_CLIENT_ID__": os.environ["AUTH0_CLIENT_ID"],
    "__AUTH0_AUDIENCE__": os.environ["AUTH0_AUDIENCE"],
    "__AUTH0_SCOPE__": os.environ["AUTH0_SCOPE"],
    "__API_BASE_URL__": os.environ["API_BASE_URL"],
    "__PROJECT_TITLE__": os.environ["PROJECT_TITLE"],
    "__PROVIDER__": os.environ["PROVIDER"],
    "__PROVIDER_ACCOUNT__": os.environ["PROVIDER_ACCOUNT"],
}
rendered = source.read_text(encoding="utf-8")
for token, value in replacements.items():
    rendered = rendered.replace(token, json.dumps(value))
remaining = [token for token in replacements if token in rendered]
if remaining:
    raise SystemExit(f"Deployment placeholders were not rendered: {remaining}")
target.write_text(rendered, encoding="utf-8")
PY

print_step "Apply the UI service, deployment, and shared HTTPS ingress"
kubectl apply -f "${NAMESPACE_MANIFEST}"
kubectl apply -f "${SERVICE_MANIFEST}"
kubectl apply -f "${RENDERED_DEPLOYMENT}"
kubectl apply -f "${INGRESS_MANIFEST}"

EXPECTED_GENERATION="$(
  kubectl get deployment "${APP_NAME}" \
    -n "${NAMESPACE}" \
    -o jsonpath='{.metadata.generation}'
)"

print_step "Wait for the exact deployment generation and image"
kubectl rollout status \
  "deployment/${APP_NAME}" \
  -n "${NAMESPACE}" \
  --timeout="${READINESS_TIMEOUT_SECONDS}s"

CURRENT_GENERATION="$(kubectl get deployment "${APP_NAME}" -n "${NAMESPACE}" -o jsonpath='{.metadata.generation}')"
OBSERVED_GENERATION="$(kubectl get deployment "${APP_NAME}" -n "${NAMESPACE}" -o jsonpath='{.status.observedGeneration}')"
CURRENT_IMAGE="$(kubectl get deployment "${APP_NAME}" -n "${NAMESPACE}" -o jsonpath='{.spec.template.spec.containers[?(@.name=="johnny-johnny-ui")].image}')"

if [[ "${CURRENT_GENERATION}" != "${EXPECTED_GENERATION}" ]]; then
  echo "Deployment generation changed during rollout verification." >&2
  exit 1
fi
if (( OBSERVED_GENERATION < EXPECTED_GENERATION )); then
  echo "The controller has not observed deployment generation ${EXPECTED_GENERATION}." >&2
  exit 1
fi
if [[ "${CURRENT_IMAGE}" != "${IMAGE_URI}" ]]; then
  echo "Deployment image mismatch: expected ${IMAGE_URI}, found ${CURRENT_IMAGE}." >&2
  exit 1
fi

EXPECTED_IMAGE="${IMAGE_URI}" APP_NAME="${APP_NAME}" \
  kubectl get pods -n "${NAMESPACE}" -l "app=${APP_NAME}" -o json \
  | EXPECTED_IMAGE="${IMAGE_URI}" APP_NAME="${APP_NAME}" python3 -c '
import json
import os
import sys

data = json.load(sys.stdin)
items = data.get("items", [])
if not items:
    raise SystemExit("No UI pods were found after rollout.")
for pod in items:
    containers = {item["name"]: item for item in pod["spec"].get("containers", [])}
    statuses = {item["name"]: item for item in pod.get("status", {}).get("containerStatuses", [])}
    container = containers.get(os.environ["APP_NAME"])
    status = statuses.get(os.environ["APP_NAME"])
    if not container or container.get("image") != os.environ["EXPECTED_IMAGE"]:
        raise SystemExit("A UI pod is not running the expected immutable image.")
    if not status or status.get("ready") is not True:
        raise SystemExit("A UI pod is not ready.")
'

wait_for_status() {
  local url="$1"
  local expected_status="$2"
  local description="$3"
  local method="${4:-GET}"
  local deadline=$((SECONDS + PUBLIC_SMOKE_TIMEOUT_SECONDS))
  local status=""

  while (( SECONDS < deadline )); do
    if [[ "${method}" == "POST" ]]; then
      status="$(curl -sS -o "${HTTP_BODY}" -w '%{http_code}' -X POST -H 'Content-Type: application/json' --data-binary '{"text":"deployment smoke"}' "${url}" || true)"
    else
      status="$(curl -sS -o "${HTTP_BODY}" -w '%{http_code}' "${url}" || true)"
    fi
    if [[ "${status}" == "${expected_status}" ]]; then
      echo "${description}: HTTP ${status}"
      return 0
    fi
    sleep 5
  done

  echo "${description} did not return HTTP ${expected_status}; last status was ${status:-unavailable}." >&2
  cat "${HTTP_BODY}" >&2 || true
  return 1
}

print_step "Verify public path routing through the existing HTTPS ALB"
wait_for_status "${PUBLIC_BASE_URL}/health/live" "200" "UI liveness"
wait_for_status "${PUBLIC_BASE_URL}/runtime-config" "200" "UI runtime configuration"
RUNTIME_CONFIG_FILE="${HTTP_BODY}" \
EXPECTED_CLIENT_ID="${AUTH0_CLIENT_ID}" \
EXPECTED_AUDIENCE="${AUTH0_AUDIENCE}" \
python3 - <<'PY'
import json
import os
from pathlib import Path

payload = json.loads(Path(os.environ["RUNTIME_CONFIG_FILE"]).read_text())
if payload.get("configured") is not True:
    raise SystemExit(f"UI runtime configuration is incomplete: {payload.get('missing')}")
if payload.get("auth0ClientId") != os.environ["EXPECTED_CLIENT_ID"]:
    raise SystemExit("The public runtime configuration does not contain the deployed SPA client ID.")
if payload.get("auth0Audience") != os.environ["EXPECTED_AUDIENCE"]:
    raise SystemExit("The public runtime configuration does not contain the deployed API audience.")

def walk_keys(value):
    if isinstance(value, dict):
        for key, child in value.items():
            yield str(key)
            yield from walk_keys(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk_keys(child)

if any("secret" in key.lower() for key in walk_keys(payload)):
    raise SystemExit("The UI runtime configuration exposes a secret-named field.")
PY
wait_for_status "${PUBLIC_BASE_URL}/api/v1/health/live" "200" "Agent liveness"
wait_for_status "${PUBLIC_BASE_URL}/api/v1/assistant/responses" "401" "Unauthenticated assistant boundary" "POST"

if [[ -n "${ACCESS_TOKEN:-}" ]]; then
  curl -fsS \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    "${PUBLIC_BASE_URL}/api/v1/auth/whoami" \
    | python3 -c 'import json,sys; payload=json.load(sys.stdin); assert payload.get("subject"); print("Authenticated whoami smoke: OK")'
fi

if [[ -n "${ASSISTANT_ACCESS_TOKEN:-}" ]]; then
  curl -fsS \
    -H "Authorization: Bearer ${ASSISTANT_ACCESS_TOKEN}" \
    "${PUBLIC_BASE_URL}/api/v1/assistant/models" \
    | python3 -c 'import json,sys; payload=json.load(sys.stdin); assert payload.get("default_model"); assert payload.get("models"); print("Authenticated model catalog smoke: OK")'
fi

print_step "Deployment complete"
echo "UI: ${PUBLIC_BASE_URL}/"
echo "Agent API: ${PUBLIC_BASE_URL}/api/v1/"
echo "Image: ${IMAGE_URI}"
