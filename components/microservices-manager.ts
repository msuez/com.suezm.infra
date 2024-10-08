import { Construct } from "constructs";
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { Duration } from "aws-cdk-lib/core";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";

interface MicroservicesManagerProps {
    vpc: Vpc;
    scope: Construct;
    environment: 'dev' | 'stg' | 'pro';
}

export class MicroservicesManager {
    private readonly props: MicroservicesManagerProps;
    private readonly microservices: Function[] = [];

    constructor(props: MicroservicesManagerProps) {
        this.props = props;
    }

    public createMicroservicesLambdas(): Function[] {
        const names = ['AuthLambda', 'CRMLambda', 'ERPLambda', 'NetworkLambda', 'PaymentsLambda', 'NotificationsLambda'];
        this.microservices.push(...names.map(name => this.createLambda(name)));
        this.setupCrossServicePolicies();
        return this.microservices;
    }

    public createApiLambda(): Function {
        const apiLambda = this.createLambda('ApiLambda');
        apiLambda.addToRolePolicy(new PolicyStatement({
            actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
            resources: ['*'],
        }));
        return apiLambda;
    }

    private createLambda(functionName: string): Function {
        const { vpc, scope, environment } = this.props;
        return new Function(scope, `${environment}-${functionName}`, {
            vpc,
            functionName: `${environment}-${functionName}`,
            memorySize: 256,
            environment: {
                NODE_ENV: environment,
            },
            handler: 'dist/app.handler',
            code: Code.fromAsset('dist'),
            runtime: Runtime.NODEJS_20_X,
            timeout: Duration.seconds(30),
            logRetention: RetentionDays.ONE_WEEK,
        });
    }

    private setupCrossServicePolicies() {
        if (this.microservices.length === 0) return;

        const invokePermissions = new PolicyStatement({
            actions: ['lambda:InvokeFunction'],
            resources: this.microservices.map(lambda => lambda.functionArn),
        });

        this.microservices.forEach((lambda, index) => {
            const policy = new Policy(this.props.scope, `CrossInvokePolicy-${index}`, {
                statements: [invokePermissions],
            });
            lambda.role?.attachInlinePolicy(policy);
        });
    }
}
