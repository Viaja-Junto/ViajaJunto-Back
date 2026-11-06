#!/usr/bin/env bash
# What is running on the emulated AWS environment. Usage: npm run aws:status
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

ministack_up || die "MiniStack is not answering on $ENDPOINT. Start it with: npm run aws:up"

log "CloudFormation stacks"
awsl cloudformation describe-stacks \
  --query 'Stacks[?starts_with(StackName, `viajajunto`)].[StackName,StackStatus]' --output table

log "ECR images"
for repo in viajajunto-api viajajunto-migrate; do
  awsl ecr describe-images --repository-name "$repo" \
    --query "imageDetails[].[\`$repo\`, imageTags[0], imagePushedAt]" --output text 2>/dev/null ||
    warn "$repo: no repository"
done

log "S3 photos bucket"
awsl s3 ls 2>/dev/null | grep viajajunto-photos || warn "no photos bucket"

log "RDS"
awsl rds describe-db-instances --db-instance-identifier "$DB_ID" \
  --query 'DBInstances[0].[DBInstanceIdentifier,DBInstanceStatus,Endpoint.Address,Endpoint.Port]' \
  --output text 2>/dev/null || warn "no instance $DB_ID"

log "EKS cluster"
awsl eks describe-cluster --name "$CLUSTER" \
  --query 'cluster.[name,status,version]' --output text 2>/dev/null || warn "no cluster $CLUSTER"

if [[ -f "$KUBECONFIG" ]] && kubectl get nodes >/dev/null 2>&1; then
  log "Kubernetes"
  kubectl get nodes -o wide
  echo
  kc get deploy,pods,svc,hpa,jobs -o wide
fi
