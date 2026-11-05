#!/usr/bin/env bash
# Demo EKS + ECR (Grupo 5) no T2, rodando no Ministack.
#
#   ./demo.sh prepare   # antes da aula: sobe tudo (idempotente)
#   ./demo.sh show      # ao vivo: só os comandos de exibição, com pausa entre eles
#
# DB_MODE=rds (padrão)  -> Postgres real do RDS do Ministack (instância t2-db)
# DB_MODE=cluster       -> Postgres como pod no próprio cluster (k8s/optional/postgres.yaml)
set -euo pipefail
cd "$(dirname "$0")"

DB_MODE="${DB_MODE:-rds}"
DB_PASSWORD="postgres123" # apenas para a demo local
STACK=t2-eks-ecr
CLUSTER=t2-cluster
REPO=t2-app
IMAGE="localhost:4566/$REPO:v1"
NETWORK=t2-net # rede Docker compartilhada por Ministack, k3s e RDS

export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1
export KUBECONFIG="$PWD/kubeconfig" # não mexe no ~/.kube/config
awsl() { aws --endpoint-url=http://localhost:4566 "$@"; } # alias não funciona em script

step() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
run() { printf '\033[1;33m$ %s\033[0m\n' "$*"; "$@"; }
pause() { read -r -p $'\n[Enter] para continuar...'; }

prepare() {
  step "Ministack (com acesso ao Docker, para EKS e RDS reais)"
  docker network inspect "$NETWORK" >/dev/null 2>&1 || docker network create "$NETWORK"
  if ! docker ps --format '{{.Names}}' | grep -x ministack >/dev/null; then
    docker start ministack 2>/dev/null || docker run -d --name ministack \
      -p 4566:4566 --network "$NETWORK" \
      -e DOCKER_NETWORK="$NETWORK" \
      -v /var/run/docker.sock:/var/run/docker.sock \
      ministackorg/ministack
  fi
  until curl -s -o /dev/null localhost:4566; do sleep 1; done

  step "CloudFormation: ECR + EKS (infra/eks-ecr.yaml)"
  awsl cloudformation deploy --stack-name "$STACK" \
    --template-file infra/eks-ecr.yaml --capabilities CAPABILITY_IAM \
    --no-fail-on-empty-changeset

  step "Build + push da imagem para o ECR"
  docker build -t "$IMAGE" .
  docker push "$IMAGE"

  step "kubeconfig do cluster EKS"
  awsl eks update-kubeconfig --name "$CLUSTER"
  until kubectl get nodes 2>/dev/null | grep ' Ready' >/dev/null; do sleep 2; done

  step "Banco (DB_MODE=$DB_MODE) + Secret t2-db"
  local db_url
  if [ "$DB_MODE" = rds ]; then
    # O AWS::RDS::DBInstance via CloudFormation no Ministack só cria metadados;
    # pela API ele sobe um Postgres real e devolve o IP na rede $NETWORK.
    awsl rds describe-db-instances --db-instance-identifier t2-db >/dev/null 2>&1 ||
      awsl rds create-db-instance --db-instance-identifier t2-db \
        --engine postgres --engine-version 16 --db-instance-class db.t3.micro \
        --allocated-storage 20 --db-name t2 \
        --master-username postgres --master-user-password "$DB_PASSWORD" >/dev/null
    awsl rds wait db-instance-available --db-instance-identifier t2-db
    local host port
    read -r host port < <(awsl rds describe-db-instances --db-instance-identifier t2-db \
      --query 'DBInstances[0].Endpoint.[Address,Port]' --output text)
    db_url="postgresql://postgres:$DB_PASSWORD@$host:$port/t2"
  elif [ "$DB_MODE" = cluster ]; then
    kubectl apply -f k8s/optional/postgres.yaml
    kubectl rollout status deploy/t2-postgres --timeout=180s
    db_url="postgresql://postgres:$DB_PASSWORD@t2-postgres:5432/t2"
  else
    echo "DB_MODE inválido: $DB_MODE (use rds ou cluster)" >&2
    exit 1
  fi
  kubectl create secret generic t2-db --from-literal=DATABASE_URL="$db_url" \
    --dry-run=client -o yaml | kubectl apply -f -

  step "Deploy da aplicação no EKS"
  kubectl apply -f k8s/
  kubectl rollout restart deploy/t2-app # pega Secret/imagem novos ao rodar de novo
  kubectl rollout status deploy/t2-app --timeout=180s
  # espera os pods antigos saírem, para o "get pods" da aula mostrar só os atuais
  while kubectl get pods -l app=t2-app --no-headers | grep -v ' 1/1 *Running' >/dev/null; do sleep 1; done
  kubectl get pods -o wide
  echo -e "\nPronto. Na aula: ./demo.sh show"
}

show() {
  step "1. Stack do CloudFormation"
  run awsl cloudformation describe-stacks --stack-name "$STACK" \
    --query 'Stacks[0].[StackName,StackStatus]' --output table
  pause

  step "2. Imagem no ECR"
  run awsl ecr describe-images --repository-name "$REPO" \
    --query 'imageDetails[?imageTags].[imageTags[0],imageDigest,imagePushedAt]' --output table
  pause

  step "3. Nós e pods no EKS"
  run kubectl get nodes,pods -o wide
  pause

  step "4. A aplicação respondendo (com o banco)"
  kubectl port-forward svc/t2-app 8080:80 >/dev/null 2>&1 &
  local pf=$!
  trap 'kill $pf 2>/dev/null || true' RETURN
  until curl -s -o /dev/null localhost:8080/api/health; do sleep 1; done
  for _ in 1 2 3; do
    run curl -s localhost:8080/api/health
    echo
  done
  pause

  step "5. (opcional) Escalar para 4 réplicas"
  read -r -p "Escalar agora? [s/N] " ans
  if [[ "$ans" =~ ^[sS]$ ]]; then
    run kubectl scale deploy/t2-app --replicas=4
    run kubectl rollout status deploy/t2-app --timeout=120s
    run kubectl get pods -o wide
  fi
}

case "${1:-}" in
  prepare) prepare ;;
  show) show ;;
  *) echo "uso: $0 prepare|show   (DB_MODE=rds|cluster)" >&2; exit 1 ;;
esac
