#!/usr/bin/env bash
# =============================================================================
# Library UI Build and Deploy Script
# =============================================================================
# Usage:
#   ./build.sh                     # Build only
#   DEPLOY=true ./build.sh         # Build and deploy
# =============================================================================

set -euo pipefail

info()    { echo -e "\033[0;34m[INFO]\033[0m $1"; }
success() { echo -e "\033[0;32m[SUCCESS]\033[0m $1"; }
warn()    { echo -e "\033[1;33m[WARN]\033[0m $1"; }
error()   { echo -e "\033[0;31m[ERROR]\033[0m $1"; }

APP_NAME=${APP_NAME:-"library-ui"}
NAMESPACE=${NAMESPACE:-"library"}
DEPLOY=${DEPLOY:-false}

REGISTRY_SERVER=${REGISTRY_SERVER:-docker.io}
REGISTRY_NAMESPACE=${REGISTRY_NAMESPACE:-codevertex}
IMAGE_REPO="${REGISTRY_SERVER}/${REGISTRY_NAMESPACE}/${APP_NAME}"

DEVOPS_REPO=${DEVOPS_REPO:-"Bengo-Hub/devops-k8s"}
DEVOPS_DIR=${DEVOPS_DIR:-"$HOME/devops-k8s"}

GIT_EMAIL=${GIT_EMAIL:-"dev@bengobox.com"}
GIT_USER=${GIT_USER:-"Library UI Bot"}

if [[ -z ${GITHUB_SHA:-} ]]; then
  GIT_COMMIT_ID=$(git rev-parse --short=8 HEAD || echo "localbuild")
else
  GIT_COMMIT_ID=${GITHUB_SHA::8}
fi

KUBE_CONFIG=${KUBE_CONFIG:-${KUBE_CONFIG_B64:-}}

# Build-time env (overridable via GitHub Secrets / workflow env)
NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-"https://libraryapi.codevertexitsolutions.com"}
NEXT_PUBLIC_SSO_URL=${NEXT_PUBLIC_SSO_URL:-"https://sso.codevertexitsolutions.com"}
NEXT_PUBLIC_NOTIFICATIONS_URL=${NEXT_PUBLIC_NOTIFICATIONS_URL:-"https://notifications.codevertexitsolutions.com"}
NEXT_PUBLIC_AUTH_API_URL=${NEXT_PUBLIC_AUTH_API_URL:-"${NEXT_PUBLIC_SSO_URL}"}
NEXT_PUBLIC_TENANT_SLUG=${NEXT_PUBLIC_TENANT_SLUG:-""}

info "Building ${APP_NAME}:${GIT_COMMIT_ID}"

if [[ ${DEPLOY} == "true" ]]; then
  info "Checking and syncing required secrets from devops-k8s..."
  SYNC_SCRIPT=$(mktemp)
  if curl -fsSL "https://raw.githubusercontent.com/${DEVOPS_REPO}/main/scripts/tools/check-and-sync-secrets.sh" -o "$SYNC_SCRIPT" 2>/dev/null; then
    source "$SYNC_SCRIPT"
    check_and_sync_secrets "REGISTRY_USERNAME" "REGISTRY_PASSWORD" "KUBE_CONFIG" || warn "Secret sync failed"
    rm -f "$SYNC_SCRIPT"
  else
    warn "Unable to download secret sync script"
  fi
fi

info "Building Docker image"
DOCKER_BUILDKIT=1 docker build . -t "${IMAGE_REPO}:${GIT_COMMIT_ID}" \
  --build-arg NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
  --build-arg NEXT_PUBLIC_SSO_URL="$NEXT_PUBLIC_SSO_URL" \
  --build-arg NEXT_PUBLIC_NOTIFICATIONS_URL="$NEXT_PUBLIC_NOTIFICATIONS_URL" \
  --build-arg NEXT_PUBLIC_AUTH_API_URL="$NEXT_PUBLIC_AUTH_API_URL" \
  --build-arg NEXT_PUBLIC_TENANT_SLUG="$NEXT_PUBLIC_TENANT_SLUG"
success "Docker build complete"

if [[ ${DEPLOY} == "true" ]]; then
  if [[ -n ${REGISTRY_USERNAME:-} && -n ${REGISTRY_PASSWORD:-} ]]; then
    echo "$REGISTRY_PASSWORD" | docker login "$REGISTRY_SERVER" -u "$REGISTRY_USERNAME" --password-stdin
  fi
  docker push "${IMAGE_REPO}:${GIT_COMMIT_ID}"
  success "Image pushed"

  if [[ -n ${KUBE_CONFIG:-} ]]; then
    mkdir -p ~/.kube
    echo "$KUBE_CONFIG" | base64 -d > ~/.kube/config 2>/dev/null || echo "$KUBE_CONFIG" > ~/.kube/config
    chmod 600 ~/.kube/config
    export KUBECONFIG=~/.kube/config
  fi

  if [[ ! -d "$DEVOPS_DIR" ]]; then
    TOKEN="${GH_PAT:-${GIT_SECRET:-${GITHUB_TOKEN:-}}}"
    CLONE_URL="https://github.com/${DEVOPS_REPO}.git"
    [[ -n $TOKEN ]] && CLONE_URL="https://x-access-token:${TOKEN}@github.com/${DEVOPS_REPO}.git"
    git clone "$CLONE_URL" "$DEVOPS_DIR" || warn "Unable to clone devops-k8s"
  fi

  source "${DEVOPS_DIR}/scripts/helm/update-values.sh" 2>/dev/null || warn "helm update script unavailable"
  if declare -f update_helm_values >/dev/null 2>&1; then
    export GIT_EMAIL="$GIT_EMAIL" GIT_USER="$GIT_USER"
    update_helm_values "$APP_NAME" "$GIT_COMMIT_ID" "$IMAGE_REPO" || warn "Helm update failed"
  fi
fi

success "Done!"
