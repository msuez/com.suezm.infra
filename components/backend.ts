import { Construct } from "constructs";
import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import { ARecord, IHostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { DomainName, EndpointType, LambdaRestApi, LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { ApiGatewayDomain } from 'aws-cdk-lib/aws-route53-targets';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { MicroservicesManager } from './microservices-manager';
import { Vpc } from "aws-cdk-lib/aws-ec2";

interface ApiGatewayOptions {
    vpc: Vpc;
    scope: Construct;
    domainName: string;
    hostedZone: IHostedZone;
    sslCertificate: ICertificate;
    environment: 'dev' | 'stg' | 'pro';
}

export class Backend {
    private readonly props: ApiGatewayOptions;
    private readonly microservicesManager: MicroservicesManager;

    constructor(options: ApiGatewayOptions) {
        this.props = options;
        this.microservicesManager = new MicroservicesManager({
            vpc: options.vpc,
            scope: options.scope,
            environment: options.environment,
        });
    }

    public start() {
        const apiLambda = this.microservicesManager.createApiLambda();
        const microservices = this.microservicesManager.createMicroservicesLambdas();
        this.setupApiGatewayPermissions(apiLambda, microservices);
        this.createApiGateway( apiLambda );
    }

    private setupApiGatewayPermissions(apiLambda: Function, microservices: Function[]) {
        microservices.forEach((microservice) => {
            apiLambda.addToRolePolicy(new PolicyStatement({
                actions: ['lambda:InvokeFunction'],
                resources: [microservice.functionArn],
            }));
            microservice.grantInvoke(apiLambda);
        });
    }

    private createApiGateway(handler: Function): void {
        const { scope, environment } = this.props;
        const apiGateway = new LambdaRestApi(scope, `${environment}-ApiGateway`, {
            handler,
            proxy: false,
            deployOptions: {
                stageName: environment,
            },
        });
        const items = apiGateway.root.addResource('{proxy+}');
        items.addMethod('ANY');
        this.createApiDnsRecords(apiGateway);
    }

    private createApiDnsRecords(apiGateway: LambdaRestApi) {
        const { scope, hostedZone, environment, sslCertificate, domainName } = this.props;
        const domainPrefix = environment === 'pro' ? '' : `${environment}.`;
        const domainNameFormatted = `${domainPrefix}api.${domainName}`;
        const wwwDomainName = `www.${domainNameFormatted}`;

        const apiDomainName = new DomainName(scope, `ApiDomain-${environment}`, {
            domainName: domainNameFormatted,
            certificate: sslCertificate,
            endpointType: EndpointType.REGIONAL,
        });

        apiDomainName.addBasePathMapping(apiGateway, { basePath: '' });

        new ARecord(scope, `ApiDomainAliasRecord-${environment}`, {
            zone: hostedZone,
            recordName: domainNameFormatted,
            target: RecordTarget.fromAlias(new ApiGatewayDomain(apiDomainName)),
        });

        new ARecord(scope, `ApiDomainAliasRecord-www-${environment}`, {
            zone: hostedZone,
            recordName: wwwDomainName,
            target: RecordTarget.fromAlias(new ApiGatewayDomain(apiDomainName)),
        });
    }
}
