import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class ProductStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 1,
    });

    const repository = new ecr.Repository(this, 'ApiRepository', {
      repositoryName: 'product-api',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    const dbCredentials = new secretsmanager.Secret(this, 'DbCredentials', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'product' }),
        generateStringKey: 'password',
        excludePunctuation: true,
      },
    });

    const database = new rds.DatabaseInstance(this, 'Postgres', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      vpc,
      credentials: rds.Credentials.fromSecret(dbCredentials),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      databaseName: 'product',
      publiclyAccessible: false,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
    });

    const cluster = new ecs.Cluster(this, 'Cluster', { vpc });

    const authSecret = new secretsmanager.Secret(this, 'BetterAuthSecret', {
      generateSecretString: {
        passwordLength: 48,
        excludePunctuation: true,
      },
    });

    // DATABASE_URL and BETTER_AUTH_URL are injected at deploy time (Secrets Manager /
    // SSM) after the ALB DNS and RDS endpoint are known. Avoid baking connection
    // strings into the image so the same Dockerfile stays portable to Render.
    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'ApiService', {
      cluster,
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 1,
      publicLoadBalancer: true,
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
        containerPort: 3000,
        environment: {
          NODE_ENV: 'production',
          PORT: '3000',
        },
        secrets: {
          BETTER_AUTH_SECRET: ecs.Secret.fromSecretsManager(authSecret),
        },
      },
    });

    database.connections.allowDefaultPortFrom(service.service);
    service.targetGroup.configureHealthCheck({
      path: '/readyz',
      healthyHttpCodes: '200',
    });

    new cdk.CfnOutput(this, 'LoadBalancerDns', {
      value: service.loadBalancer.loadBalancerDnsName,
    });
    new cdk.CfnOutput(this, 'EcrRepositoryUri', {
      value: repository.repositoryUri,
    });
    new cdk.CfnOutput(this, 'DbEndpoint', {
      value: database.instanceEndpoint.hostname,
    });
    new cdk.CfnOutput(this, 'DbSecretArn', {
      value: dbCredentials.secretArn,
    });
  }
}
