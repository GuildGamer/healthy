# AWS CDK (optional path)

Defines VPC, ECR, ECS Fargate + ALB, and RDS Postgres for the API.

```bash
cd infra
pnpm install
npx cdk bootstrap   # once per account/region
npx cdk synth
npx cdk deploy
```

Push the image built from `apps/api/Dockerfile` to the ECR repository output, then update the service.

Prefer Render (`render.yaml`) until AWS Activate credits or scale justify this stack.
Application code stays provider-neutral either way.
