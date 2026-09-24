import * as cdk from 'aws-cdk-lib/core';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sfn_tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as path from 'path';
import {Construct} from 'constructs';

export class CanvasOlcInsightsStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // DynamoDB Table — ephemeral review sessions
        const reviewsTable = new dynamodb.Table(this, 'ReviewsTable', {
            tableName: 'canvas-olc-insights-reviews',
            partitionKey: {name: 'review_id', type: dynamodb.AttributeType.STRING},
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // DynamoDB Table — finalized scorecards, kept ephemeral like the rest
        // of this stack (DESTROY is intentional here, not an oversight)
        const historyTable = new dynamodb.Table(this, 'CourseHistoryTable', {
            tableName: 'canvas-olc-insights-history',
            partitionKey: {name: 'course_id', type: dynamodb.AttributeType.STRING},
            sortKey: {name: 'completed_at', type: dynamodb.AttributeType.STRING},
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // S3 Content Bucket
        const contentBucket = new s3.Bucket(this, 'ContentBucket', {
            bucketName: `canvas-olc-insights-content-${this.account}-${this.region}`,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            lifecycleRules: [
                {
                    expiration: cdk.Duration.days(30),
                    prefix: 'reviews/',
                },
            ],
        });

        // S3 Frontend Bucket
        const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
            bucketName: `canvas-olc-insights-frontend-${this.account}-${this.region}`,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        });

        // Cognito User Pool
        const userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: 'canvas-olc-insights-user-pool',
            selfSignUpEnabled: false,
            signInAliases: {email: true},
            autoVerify: {email: true},
            passwordPolicy: {
                minLength: 8,
                requireUppercase: true,
                requireLowercase: true,
                requireDigits: true,
                requireSymbols: false,
            },
            mfa: cognito.Mfa.OFF,
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
            userPool,
            userPoolClientName: 'canvas-olc-insights-client',
            authFlows: {
                userSrp: true,
                userPassword: true,
            },
            oAuth: {
                flows: {authorizationCodeGrant: true},
                scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
                callbackUrls: [
                    'http://localhost:5173/',
                    'http://localhost:3000/',
                    ...(process.env.FRONTEND_URL ? [`${process.env.FRONTEND_URL}/`] : []),
                ],
                logoutUrls: [
                    'http://localhost:5173/',
                    'http://localhost:3000/',
                    ...(process.env.FRONTEND_URL ? [`${process.env.FRONTEND_URL}/`] : []),
                ],
            },
            preventUserExistenceErrors: true,
        });

        // Cognito-managed hosted domain — required for the hosted login page
        // the frontend redirects to. Without this, the authorizationCodeGrant
        // OAuth flow above has a client configured but nowhere to send the
        // user to actually log in. AWS assigns the domain prefix globally
        // (across all AWS accounts), so a fixed prefix like the stack/app
        // name can collide with another account's already-taken prefix —
        // appending the account ID keeps it unique to this deployment.
        const userPoolDomain = userPool.addDomain('UserPoolDomain', {
            cognitoDomain: {
                domainPrefix: `canvas-olc-insights-${this.account}`,
            },
        });

        // Canvas API token — Lambdas fetch from SSM SecureString at runtime;
        // only the parameter name is in the template, never the plaintext
        const canvasApiTokenParam = '/qa-bot/canvas-api-token';
        const canvasApiTokenArn = `arn:aws:ssm:${this.region}:${this.account}:parameter${canvasApiTokenParam}`;

        // Lambda bundling options
        const pythonBundling = {
            image: lambda.Runtime.PYTHON_3_13.bundlingImage,
            platform: 'linux/arm64',
            command: [
                'bash', '-c',
                [
                    'pip install -r requirements.txt -t /asset-output',
                    'rm -rf /asset-output/boto3* /asset-output/botocore* /asset-output/s3transfer* /asset-output/urllib3*',
                    'cp -au *.py /asset-output/',
                ].join(' && '),
            ],
        };

        const extractionBundling = {
            image: lambda.Runtime.PYTHON_3_13.bundlingImage,
            platform: 'linux/arm64',
            command: [
                'bash', '-c',
                [
                    'pip install -r requirements-extraction.txt -t /asset-output',
                    'rm -rf /asset-output/boto3* /asset-output/botocore* /asset-output/s3transfer* /asset-output/urllib3*',
                    'cp -au *.py /asset-output/',
                ].join(' && '),
            ],
        };

        const backendPath = path.join(__dirname, '../../backend');

        // Extraction Lambda — BFS crawl + structural metadata + quality checks
        const extractionFunction = new lambda.Function(this, 'ExtractionFunction', {
            runtime: lambda.Runtime.PYTHON_3_13,
            architecture: lambda.Architecture.ARM_64,
            handler: 'extraction.handler',
            code: lambda.Code.fromAsset(backendPath, {bundling: extractionBundling}),
            functionName: 'canvas-olc-insights-extraction',
            timeout: cdk.Duration.minutes(5),
            memorySize: 2048,
            environment: {
                REVIEWS_TABLE: reviewsTable.tableName,
                CONTENT_BUCKET: contentBucket.bucketName,
                CANVAS_API_TOKEN_SSM_PARAM: canvasApiTokenParam,
                CANVAS_BASE_URL: process.env.CANVAS_BASE_URL || 'https://your-canvas-instance.instructure.com',
            },
        });

        contentBucket.grantReadWrite(extractionFunction);
        reviewsTable.grantWriteData(extractionFunction);
        extractionFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ['ssm:GetParameter'],
            resources: [canvasApiTokenArn],
        }));

        // Evaluation Lambda — evaluates all 50 objectives + generates summaries
        const evaluationFunction = new lambda.Function(this, 'EvaluationFunction', {
            runtime: lambda.Runtime.PYTHON_3_13,
            architecture: lambda.Architecture.ARM_64,
            handler: 'evaluation.handler',
            code: lambda.Code.fromAsset(backendPath, {bundling: pythonBundling}),
            functionName: 'canvas-olc-insights-evaluation',
            timeout: cdk.Duration.minutes(10),
            memorySize: 512,
            environment: {
                REVIEWS_TABLE: reviewsTable.tableName,
                CONTENT_BUCKET: contentBucket.bucketName,
                BEDROCK_MODEL_ID: process.env.EVALUATION_BEDROCK_MODEL_ID || 'us.anthropic.claude-sonnet-4-6',
            },
        });

        contentBucket.grantReadWrite(evaluationFunction);
        reviewsTable.grantReadWriteData(evaluationFunction);
        // Grants both action sets — a live 403 in testing showed the actual
        // runtime call needs bedrock:InvokeModel (against the cross-region
        // inference profile ARN), contradicting the assumption that
        // BedrockConverseModel only ever calls the Converse API. Trusting
        // the observed error over that assumption; granting both is the
        // safe fix regardless of which path this pydantic-ai version takes.
        evaluationFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                'bedrock:Converse', 'bedrock:ConverseStream',
                'bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream',
            ],
            resources: ['*'],
        }));

        // Step Functions — 2-step pipeline: Extract → Evaluate
        const extractionTask = new sfn_tasks.LambdaInvoke(this, 'ExtractCourse', {
            lambdaFunction: extractionFunction,
            resultPath: '$.extractionResult',
        });

        const evaluationTask = new sfn_tasks.LambdaInvoke(this, 'EvaluateObjectives', {
            lambdaFunction: evaluationFunction,
            payload: sfn.TaskInput.fromObject({
                review_id: sfn.JsonPath.stringAt('$.review_id'),
            }),
            resultPath: '$.evaluationResult',
        });

        const definition = extractionTask.next(evaluationTask);

        const stateMachine = new sfn.StateMachine(this, 'ReviewStateMachine', {
            stateMachineName: 'canvas-olc-insights-review-pipeline',
            definitionBody: sfn.DefinitionBody.fromChainable(definition),
            timeout: cdk.Duration.hours(1),
        });

        // Plan Lambda (async improvement plan generation)
        const planFunction = new lambda.Function(this, 'PlanFunction', {
            runtime: lambda.Runtime.PYTHON_3_13,
            architecture: lambda.Architecture.ARM_64,
            handler: 'plan.handler',
            code: lambda.Code.fromAsset(backendPath, {bundling: pythonBundling}),
            functionName: 'canvas-olc-insights-plan',
            timeout: cdk.Duration.minutes(5),
            memorySize: 512,
            environment: {
                CONTENT_BUCKET: contentBucket.bucketName,
                HISTORY_TABLE: historyTable.tableName,
                BEDROCK_MODEL_ID: process.env.PLAN_BEDROCK_MODEL_ID || 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
            },
        });

        contentBucket.grantReadWrite(planFunction);
        historyTable.grantReadData(planFunction);
        // Same fix as evaluationFunction above — both action sets needed.
        planFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                'bedrock:Converse', 'bedrock:ConverseStream',
                'bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream',
            ],
            resources: ['*'],
        }));

        // API Lambda
        const apiFunction = new lambda.Function(this, 'ApiFunction', {
            runtime: lambda.Runtime.PYTHON_3_13,
            architecture: lambda.Architecture.ARM_64,
            handler: 'api.handler',
            code: lambda.Code.fromAsset(backendPath, {bundling: pythonBundling}),
            functionName: 'canvas-olc-insights-api',
            timeout: cdk.Duration.minutes(1),
            memorySize: 1024,
            environment: {
                REVIEWS_TABLE: reviewsTable.tableName,
                CONTENT_BUCKET: contentBucket.bucketName,
                REVIEW_STATE_MACHINE_ARN: stateMachine.stateMachineArn,
                PLAN_FUNCTION_NAME: planFunction.functionName,
                HISTORY_TABLE: historyTable.tableName,
                CANVAS_API_TOKEN_SSM_PARAM: canvasApiTokenParam,
                CANVAS_BASE_URL: process.env.CANVAS_BASE_URL || 'https://your-canvas-instance.instructure.com',
            },
        });

        reviewsTable.grantReadWriteData(apiFunction);
        contentBucket.grantReadWrite(apiFunction);
        historyTable.grantReadWriteData(apiFunction);
        stateMachine.grantStartExecution(apiFunction);
        planFunction.grantInvoke(apiFunction);
        apiFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: ['ssm:GetParameter'],
            resources: [canvasApiTokenArn],
        }));

        // API Gateway
        const api = new apigateway.RestApi(this, 'ApiGateway', {
            restApiName: 'Canvas OLC Insights API',
            description: 'Canvas OLC Insights REST API',
        });

        const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
            cognitoUserPools: [userPool],
            authorizerName: 'canvas-olc-insights-authorizer',
        });

        const proxyResource = api.root.addResource('api').addProxy({
            defaultIntegration: new apigateway.LambdaIntegration(apiFunction),
            defaultMethodOptions: {
                authorizer: cognitoAuthorizer,
                authorizationType: apigateway.AuthorizationType.COGNITO,
            },
            anyMethod: true,
        });

        // CloudFront Distribution
        const oac = new cloudfront.S3OriginAccessControl(this, 'FrontendOAC', {
            originAccessControlName: 'canvas-olc-insights-frontend-oac',
        });

        const apiDomainName = `${api.restApiId}.execute-api.${this.region}.amazonaws.com`;

        const distribution = new cloudfront.Distribution(this, 'Distribution', {
            defaultBehavior: {
                origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket, {
                    originAccessControl: oac,
                }),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            additionalBehaviors: {
                '/api/*': {
                    origin: new origins.HttpOrigin(apiDomainName, {
                        originPath: `/${api.deploymentStage.stageName}`,
                    }),
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                    cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
                    originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
                },
            },
            defaultRootObject: 'index.html',
            errorResponses: [
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.seconds(0),
                },
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: cdk.Duration.seconds(0),
                },
            ],
        });

        // Deploy the built frontend into frontendBucket and invalidate
        // CloudFront so changes actually show up. Without this, the bucket
        // stays empty after deploy and CloudFront has nothing to serve.
        // Adjust the path to wherever your frontend's build step outputs
        // static files (e.g. Vite's default is 'dist', CRA's is 'build').
        new s3deploy.BucketDeployment(this, 'DeployFrontend', {
            sources: [s3deploy.Source.asset(path.join(__dirname, '../../frontend/dist'))],
            destinationBucket: frontendBucket,
            distribution,
            distributionPaths: ['/*'],
        });

        // Outputs
        new cdk.CfnOutput(this, 'ApiUrl', {
            value: api.url,
            description: 'API Gateway URL',
        });

        new cdk.CfnOutput(this, 'CloudFrontUrl', {
            value: `https://${distribution.distributionDomainName}`,
            description: 'CloudFront Distribution URL',
        });

        new cdk.CfnOutput(this, 'UserPoolId', {
            value: userPool.userPoolId,
            description: 'Cognito User Pool ID',
        });

        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: userPoolClient.userPoolClientId,
            description: 'Cognito User Pool Client ID',
        });

        new cdk.CfnOutput(this, 'CognitoHostedUiUrl', {
            value: `https://${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`,
            description: 'Cognito Hosted UI domain — base URL for the login page',
        });

        new cdk.CfnOutput(this, 'FrontendBucketName', {
            value: frontendBucket.bucketName,
            description: 'Frontend S3 Bucket Name',
        });
    }
}