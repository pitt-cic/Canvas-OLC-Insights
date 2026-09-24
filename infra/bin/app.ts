#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import {CanvasOlcInsightsStack} from '../lib/infra-stack';

const app = new cdk.App();
new CanvasOlcInsightsStack(app, 'CanvasOlcInsightsStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    },
    description: 'Canvas OLC Insights Infrastructure',
});
