#!/usr/bin/env node
const { App } = require('aws-cdk-lib');
const { ProductStack } = require('../dist/product-stack');

const app = new App();
new ProductStack(app, 'ProductStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
});
