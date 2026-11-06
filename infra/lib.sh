# Shared by deploy.sh, status.sh and destroy.sh. Every AWS call goes to
# MiniStack: no real AWS account is touched.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/infra/.out"

ENDPOINT="${AWS_ENDPOINT_URL:-http://localhost:4566}"
REGISTRY="${ENDPOINT#http://}"
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
export AWS_PAGER=""
# Never touches ~/.kube/config.
export KUBECONFIG="$OUT/kubeconfig"

CLUSTER="viajajunto"
NAMESPACE="viajajunto"
REGISTRY_STACK="viajajunto-registry"
CLUSTER_STACK="viajajunto-cluster"
STORAGE_STACK="viajajunto-storage"
DB_ID="viajajunto-db"
DB_NAME="viajajunto"
DB_USER="viajajunto"
DB_PASSWORD="${DB_PASSWORD:-viajajunto-local}"

log() { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die() {
  printf '\n\033[31m✗ %s\033[0m\n' "$*" >&2
  exit 1
}
awsl() { aws --endpoint-url "$ENDPOINT" "$@"; }
kc() { kubectl --namespace "$NAMESPACE" "$@"; }

ministack_up() {
  curl -fsS "$ENDPOINT/_ministack/health" >/dev/null 2>&1
}
