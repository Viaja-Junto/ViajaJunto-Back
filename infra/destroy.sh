#!/usr/bin/env bash
# Removes everything infra/deploy.sh created. Usage: npm run aws:destroy
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

ministack_up || die "MiniStack is not answering on $ENDPOINT. Start it with: npm run aws:up"

if [[ -f "$KUBECONFIG" ]] && kubectl get nodes >/dev/null 2>&1; then
  log "Kubernetes: namespace $NAMESPACE"
  kubectl delete namespace "$NAMESPACE" --ignore-not-found --wait=true >/dev/null && ok "deleted"
fi

log "CloudFormation: $CLUSTER_STACK"
awsl cloudformation delete-stack --stack-name "$CLUSTER_STACK"
awsl cloudformation wait stack-delete-complete --stack-name "$CLUSTER_STACK" 2>/dev/null
ok "deleted"

# A bucket with objects cannot be deleted, so it is emptied first.
log "S3: photos and $STORAGE_STACK"
bucket=$(awsl cloudformation describe-stacks --stack-name "$STORAGE_STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='PhotosBucketName'].OutputValue" --output text 2>/dev/null || true)
[[ -z "$bucket" || "$bucket" == None ]] || awsl s3 rm "s3://$bucket" --recursive >/dev/null 2>&1 || true
awsl cloudformation delete-stack --stack-name "$STORAGE_STACK"
awsl cloudformation wait stack-delete-complete --stack-name "$STORAGE_STACK" 2>/dev/null
ok "deleted"

# A repository with images cannot be deleted, so the images go first.
log "ECR: images and $REGISTRY_STACK"
for repo in viajajunto-api viajajunto-migrate; do
  ids=$(awsl ecr list-images --repository-name "$repo" --query 'imageIds[*]' --output json 2>/dev/null || echo '[]')
  [[ "$ids" == "[]" ]] || awsl ecr batch-delete-image --repository-name "$repo" --image-ids "$ids" >/dev/null
done
awsl cloudformation delete-stack --stack-name "$REGISTRY_STACK"
awsl cloudformation wait stack-delete-complete --stack-name "$REGISTRY_STACK" 2>/dev/null
ok "deleted"

log "RDS: $DB_ID"
if awsl rds describe-db-instances --db-instance-identifier "$DB_ID" >/dev/null 2>&1; then
  awsl rds delete-db-instance --db-instance-identifier "$DB_ID" --skip-final-snapshot >/dev/null
  ok "deleted"
else
  ok "nothing to delete"
fi

rm -rf "$OUT"
