#!/usr/bin/env bash
# Roteiro da apresentação do Grupo 5 (EKS + ECR), rodando no Ministack.
#
#   ./demo.sh prepare   # antes da aula: sobe tudo (idempotente, ~2 min)
#   ./demo.sh show      # ao vivo: só os comandos de exibição, com pausa entre eles
#
# DB_MODE=rds (padrão) -> PostgreSQL real do RDS do Ministack
# DB_MODE=cluster      -> PostgreSQL como pod dentro do próprio cluster
set -euo pipefail
cd "$(dirname "$0")"
source infra/lib.sh

step() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
run() {
  printf '\033[1;33m$ %s\033[0m\n' "$*"
  "$@"
}
pause() { read -r -p $'\n[Enter] para continuar...'; }
json() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(($1)(JSON.parse(s))))"; }

prepare() {
  docker compose --profile aws up -d --wait ministack
  bash infra/deploy.sh
  echo -e "\nPronto. Na aula: ./demo.sh show"
}

show() {
  ministack_up || die "Ministack fora do ar. Rode antes: ./demo.sh prepare"

  step "1. Infraestrutura como código: stacks do CloudFormation"
  run aws --endpoint-url "$ENDPOINT" cloudformation describe-stacks \
    --query 'Stacks[?starts_with(StackName, `viajajunto`)].[StackName,StackStatus]' --output table
  pause

  step "2. Imagens no ECR (API e migrations), com a tag do commit"
  for repo in viajajunto-api viajajunto-migrate; do
    run aws --endpoint-url "$ENDPOINT" ecr describe-images --repository-name "$repo" \
      --query 'imageDetails[?imageTags].[imageTags[0],imagePushedAt]' --output table
  done
  pause

  step "3. Cluster EKS: nó, pods, service e autoscaler"
  run aws --endpoint-url "$ENDPOINT" eks describe-cluster --name "$CLUSTER" \
    --query 'cluster.[name,status,version]' --output table
  run kubectl get nodes -o wide
  run kubectl -n "$NAMESPACE" get deploy,pods,svc,hpa,jobs -o wide
  pause

  step "4. A API respondendo de dentro do cluster (com o banco no RDS)"
  kubectl -n "$NAMESPACE" port-forward svc/viajajunto-api 8080:80 >/dev/null 2>&1 &
  local pf=$!
  trap 'kill $pf 2>/dev/null || true' RETURN
  until curl -s -o /dev/null localhost:8080/api/health; do sleep 1; done
  run curl -s localhost:8080/api/health
  echo
  echo "Documentação: http://localhost:8080/docs"
  pause

  step "5. Fluxo real: cadastro, avaliação e a nota média atualizada"
  local email token spot
  email="aluno-$(date +%s)@viajajunto.local"
  printf '\033[1;33m$ POST /api/auth/register (%s)\033[0m\n' "$email"
  token=$(curl -s -X POST localhost:8080/api/auth/register -H 'Content-Type: application/json' \
    -d "{\"name\":\"Turma de Cloud\",\"email\":\"$email\",\"password\":\"viaja-junto-2026\"}" |
    json 'b => b.accessToken')
  spot=$(curl -s 'localhost:8080/api/tourist-spots?q=iber' | json 'b => b.data[0].id')
  printf '\033[1;33m$ GET /api/tourist-spots/%s\033[0m\n' "$spot"
  curl -s "localhost:8080/api/tourist-spots/$spot" |
    json 'b => `${b.name}: média ${b.averageRating ?? "-"} (${b.reviewCount} avaliações)`'
  printf '\033[1;33m$ POST /api/reviews (nota 5)\033[0m\n'
  curl -s -X POST localhost:8080/api/reviews -H "Authorization: Bearer $token" \
    -H 'Content-Type: application/json' -d "{\"touristSpotId\":\"$spot\",\"rating\":5}" |
    json 'b => `avaliação ${b.id} criada`'
  curl -s "localhost:8080/api/tourist-spots/$spot" |
    json 'b => `${b.name}: média ${b.averageRating} (${b.reviewCount} avaliações)`'
  printf '\033[1;33m$ GET /api/tourist-spots/top\033[0m\n'
  curl -s 'localhost:8080/api/tourist-spots/top?limit=5' |
    json 'l => l.map((s, i) => `${i + 1}. ${s.name} (${s.averageRating})`).join("\n")'
  pause

  step "6. Autocura: apagando um pod, o Deployment recria outro"
  local victim
  victim=$(kubectl -n "$NAMESPACE" get pods -l app.kubernetes.io/name=viajajunto-api -o jsonpath='{.items[0].metadata.name}')
  run kubectl -n "$NAMESPACE" delete pod "$victim" --wait=false
  run kubectl -n "$NAMESPACE" rollout status deploy/viajajunto-api --timeout=120s
  run kubectl -n "$NAMESPACE" get pods -l app.kubernetes.io/name=viajajunto-api -o wide
  pause

  step "7. (opcional) Escalar para 4 réplicas"
  read -r -p "Escalar agora? [s/N] " ans
  if [[ "$ans" =~ ^[sS]$ ]]; then
    run kubectl -n "$NAMESPACE" scale deploy/viajajunto-api --replicas=4
    run kubectl -n "$NAMESPACE" rollout status deploy/viajajunto-api --timeout=120s
    run kubectl -n "$NAMESPACE" get pods -l app.kubernetes.io/name=viajajunto-api -o wide
    run kubectl -n "$NAMESPACE" scale deploy/viajajunto-api --replicas=2
  fi
}

case "${1:-}" in
  prepare) prepare ;;
  show) show ;;
  *)
    echo "uso: $0 prepare|show   (DB_MODE=rds|cluster)" >&2
    exit 1
    ;;
esac
