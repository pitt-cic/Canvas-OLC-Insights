#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import {CanvasOlcInsightsStack} from '../lib/infra-stack';

const app = new cdk.App();
// A STAGE copy must be its own stack, or deploying it would rename (and so replace) this stack's tables and buckets.
new CanvasOlcInsightsStack(app, `CanvasOlcInsightsStack${process.env.STAGE ? `-${process.env.STAGE}` : ''}`, {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    },
    description: 'Canvas OLC Insights Infrastructure',
});
