#!/usr/bin/env bash
# RDS -> ECR -> S3 -> EKS -> migrations -> API -> seed, on MiniStack. Idempotent.
# Usage: npm run aws:up && npm run aws:deploy   [DB_MODE=cluster] [SKIP_BUILD=1] [SKIP_SEED=1]
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

DB_MODE="${DB_MODE:-rds}"
IMAGE_TAG="${IMAGE_TAG:-$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo latest)}"

check_prereqs() {
  command -v aws >/dev/null || die "AWS CLI not found. Install it with: brew install awscli"
  command -v kubectl >/dev/null || die "kubectl not found. Install it with: brew install kubectl"
  command -v docker >/dev/null || die "Docker not found."
  ministack_up || die "MiniStack is not answering on $ENDPOINT. Start it with: npm run aws:up"
  [[ "$DB_MODE" == rds || "$DB_MODE" == cluster ]] || die "DB_MODE must be rds or cluster"
  mkdir -p "$OUT"
  ok "MiniStack up at $ENDPOINT"
}

# RDS API, not CloudFormation: MiniStack creates a templated DBInstance as metadata only.
create_database() {
  [[ "$DB_MODE" == rds ]] || return 0
  log "RDS: PostgreSQL instance"
  if awsl rds describe-db-instances --db-instance-identifier "$DB_ID" >/dev/null 2>&1; then
    ok "instance $DB_ID already exists"
  else
    awsl rds create-db-instance \
      --db-instance-identifier "$DB_ID" \
      --engine postgres --engine-version 17 \
      --db-instance-class db.t3.micro --allocated-storage 20 \
      --master-username "$DB_USER" --master-user-password "$DB_PASSWORD" \
      --db-name "$DB_NAME" >/dev/null
    ok "instance $DB_ID requested"
  fi
  awsl rds wait db-instance-available --db-instance-identifier "$DB_ID"
  read -r DB_HOST DB_PORT < <(awsl rds describe-db-instances --db-instance-identifier "$DB_ID" \
    --query 'DBInstances[0].Endpoint.[Address,Port]' --output text)
  ok "available at $DB_HOST:$DB_PORT"
}

deploy_registry() {
  log "CloudFormation: registry stack"
  awsl cloudformation deploy --stack-name "$REGISTRY_STACK" \
    --template-file "$ROOT/infra/cloudformation/registry.yaml" \
    --no-fail-on-empty-changeset >/dev/null
  ok "stack $REGISTRY_STACK"
}

deploy_storage() {
  log "CloudFormation: photos bucket stack"
  awsl cloudformation deploy --stack-name "$STORAGE_STACK" \
    --template-file "$ROOT/infra/cloudformation/storage.yaml" \
    --no-fail-on-empty-changeset >/dev/null
  PHOTOS_BUCKET=$(awsl cloudformation describe-stacks --stack-name "$STORAGE_STACK" \
    --query "Stacks[0].Outputs[?OutputKey=='PhotosBucketName'].OutputValue" --output text)
  # Pods reach MiniStack on the Docker network; browsers through the published port.
  local ministack_ip
  ministack_ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' viajajunto-ministack)
  S3_ENDPOINT="http://$ministack_ip:4566"
  S3_PUBLIC_URL="$ENDPOINT/$PHOTOS_BUCKET"
  ok "bucket $PHOTOS_BUCKET (public URL $S3_PUBLIC_URL)"
}

push_images() {
  if [[ "${SKIP_BUILD:-0}" != 1 ]]; then
    log "Docker: building the API and migration images"
    docker compose -f "$ROOT/docker-compose.yml" build api migrate
  fi
  log "ECR: pushing images (tag $IMAGE_TAG)"
  for name in api migrate; do
    docker tag "viajajunto-$name:local" "$REGISTRY/viajajunto-$name:$IMAGE_TAG"
    docker push -q "$REGISTRY/viajajunto-$name:$IMAGE_TAG" >/dev/null
    ok "viajajunto-$name:$IMAGE_TAG"
  done
  # k3s mirrors the ECR hostname to MiniStack's registry, as an EKS node pulls from ECR.
  local account
  account=$(awsl sts get-caller-identity --query Account --output text)
  ECR_HOST="$account.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com"
  API_IMAGE="$ECR_HOST/viajajunto-api:$IMAGE_TAG"
  MIGRATE_IMAGE="$ECR_HOST/viajajunto-migrate:$IMAGE_TAG"
}

deploy_cluster() {
  log "CloudFormation: EKS cluster stack"
  awsl cloudformation deploy --stack-name "$CLUSTER_STACK" \
    --template-file "$ROOT/infra/cloudformation/cluster.yaml" \
    --capabilities CAPABILITY_NAMED_IAM --no-fail-on-empty-changeset >/dev/null
  ok "stack $CLUSTER_STACK"

  awsl eks wait cluster-active --name "$CLUSTER"
  awsl eks update-kubeconfig --name "$CLUSTER" --kubeconfig "$KUBECONFIG" >/dev/null
  # Credentials in the kubeconfig, so kubectl also works outside this script.
  kubectl config set-credentials "$(kubectl config view --minify -o jsonpath='{.users[0].name}')" \
    --exec-env="AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID" \
    --exec-env="AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY" >/dev/null
  local tries=0
  until kubectl get nodes 2>/dev/null | grep -q ' Ready'; do
    ((tries++ < 90)) || die "the cluster nodes never became Ready"
    sleep 2
  done
  ok "cluster $CLUSTER ready ($(kubectl get nodes --no-headers | wc -l | tr -d ' ') node)"
}

configure() {
  log "Kubernetes: namespace, configuration and secrets"
  kubectl apply -f "$ROOT/k8s/namespace.yaml" >/dev/null
  kubectl apply -f "$ROOT/k8s/configmap.yaml" >/dev/null

  local database_url
  if [[ "$DB_MODE" == rds ]]; then
    database_url="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=public"
    kubectl delete -f "$ROOT/k8s/optional/postgres.yaml" --ignore-not-found >/dev/null
  else
    kubectl apply -f "$ROOT/k8s/optional/postgres.yaml" >/dev/null
    kc rollout status deploy/viajajunto-postgres --timeout=180s >/dev/null
    database_url="postgresql://postgres:viajajunto-local@viajajunto-postgres:5432/viajajunto?schema=public"
  fi

  # Kept across deploys: a new secret would sign every user out.
  local jwt_secret
  jwt_secret=$(kc get secret viajajunto-secrets -o jsonpath='{.data.JWT_SECRET}' 2>/dev/null | base64 -d || true)
  [[ -n "$jwt_secret" ]] || jwt_secret=$(openssl rand -base64 48)

  kc create secret generic viajajunto-secrets \
    --from-literal=DATABASE_URL="$database_url" \
    --from-literal=JWT_SECRET="$jwt_secret" \
    --from-literal=AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
    --from-literal=AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
    --dry-run=client -o yaml | kubectl apply -f - >/dev/null
  ok "Secret viajajunto-secrets (DATABASE_URL, JWT_SECRET, S3 credentials) — database: $DB_MODE"

  kc create configmap viajajunto-storage \
    --from-literal=AWS_REGION="$AWS_DEFAULT_REGION" \
    --from-literal=S3_BUCKET="$PHOTOS_BUCKET" \
    --from-literal=S3_ENDPOINT="$S3_ENDPOINT" \
    --from-literal=S3_PUBLIC_URL="$S3_PUBLIC_URL" \
    --from-literal=S3_FORCE_PATH_STYLE=true \
    --dry-run=client -o yaml | kubectl apply -f - >/dev/null
  ok "ConfigMap viajajunto-storage (bucket $PHOTOS_BUCKET)"

  # Pods read config only on start: the hash in the pod template rolls them on change.
  CONFIG_HASH=$(printf '%s\n%s\n%s\n%s\n' "$database_url" "$jwt_secret" "$PHOTOS_BUCKET" "$S3_ENDPOINT" |
    cat - "$ROOT/k8s/configmap.yaml" | shasum -a 256 | cut -c1-16)
}

render() {
  sed -e "s|__API_IMAGE__|$API_IMAGE|g" \
    -e "s|__MIGRATE_IMAGE__|$MIGRATE_IMAGE|g" \
    -e "s|__CONFIG_HASH__|$CONFIG_HASH|g" "$1"
}

# Jobs are immutable: the previous run is replaced by this release's.
run_job() {
  local name="$1" manifest="$2"
  kc delete job "$name" --ignore-not-found >/dev/null
  render "$manifest" | kubectl apply -f - >/dev/null
  if ! kc wait --for=condition=complete "job/$name" --timeout=300s >/dev/null; then
    kc logs "job/$name" --tail=50 || true
    die "job $name failed"
  fi
}

run_migrations() {
  log "Prisma: applying migrations (Job viajajunto-migrate)"
  run_job viajajunto-migrate "$ROOT/k8s/jobs/migrate.yaml"
  ok "migrations applied"
}

deploy_api() {
  log "Kubernetes: API deployment, service and autoscaler"
  render "$ROOT/k8s/deployment.yaml" | kubectl apply -f - >/dev/null
  kubectl apply -f "$ROOT/k8s/service.yaml" -f "$ROOT/k8s/hpa.yaml" >/dev/null
  if ! kc rollout status deploy/viajajunto-api --timeout=300s >/dev/null; then
    kc get pods -l app.kubernetes.io/name=viajajunto-api
    die "the API rollout did not finish"
  fi
  ok "deployment viajajunto-api rolled out ($API_IMAGE)"
}

seed_data() {
  [[ "${SKIP_SEED:-0}" != 1 ]] || return 0
  log "Sample data (Job viajajunto-seed)"
  run_job viajajunto-seed "$ROOT/k8s/jobs/seed.yaml"
  ok "$(kc logs job/viajajunto-seed --tail=1)"
}

summary() {
  log "Done"
  kc get pods -o wide
  cat <<MSG

  Try it:
    export KUBECONFIG=$KUBECONFIG
    kubectl -n $NAMESPACE port-forward svc/viajajunto-api 8080:80
    curl localhost:8080/api/health
MSG
}

check_prereqs
create_database
deploy_registry
deploy_storage
push_images
deploy_cluster
configure
run_migrations
deploy_api
seed_data
summary
