import { Construct } from "constructs";
import { Duration, RemovalPolicy } from "aws-cdk-lib/core";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { Distribution, OriginAccessIdentity, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { ARecord, IHostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';

interface WebappOptions {
    scope: Construct;
    domainName: string;
    hostedZone: IHostedZone;
    sslCertificate: ICertificate;
    environment: 'dev' | 'stg' | 'pro';
}

export class Webapp {
    
    private readonly props: WebappOptions;

    constructor(options: WebappOptions) {
        this.props = options;
    }

    public start() {
        const bucket = this.createS3WebisteBucket();
        const distribution = this.createCloudFrontDistribution(bucket);
        this.createDnsRecords(distribution);
    }

    private createS3WebisteBucket(): Bucket {
        const {
            scope,
            domainName,
            environment,
        } = this.props;

        return new Bucket(scope, `${environment}-WebsiteBucket`, {
            bucketName: `${environment}.${domainName}`,
            publicReadAccess: true,
            websiteIndexDocument: 'index.html',
            websiteErrorDocument: 'error.html',
            removalPolicy: environment === 'pro' ?
                RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
            autoDeleteObjects: environment !== 'pro',
            blockPublicAccess: new BlockPublicAccess({
                blockPublicAcls: false,
                blockPublicPolicy: false,
                ignorePublicAcls: false,
                restrictPublicBuckets: false,
            }),
        });
    }

    private createCloudFrontDistribution(bucket: Bucket): Distribution {
        const { scope, sslCertificate, environment, domainName } = this.props;
        const domainNames = [
            `${environment === 'pro' ? '' : `${environment}.`}${domainName}`, 
            `www.${environment === 'pro' ? '' : `${environment}.`}${domainName}`
        ].filter(Boolean);

        const originAccessIdentity = new OriginAccessIdentity(scope, `${environment}-OAI`);

        bucket.grantRead(originAccessIdentity);

        return new Distribution(scope, `${environment}-WebsiteDistribution`, {
            defaultBehavior: {
                origin: new S3Origin(bucket, {
                    originAccessIdentity: originAccessIdentity,
                }),
                viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            domainNames,
            certificate: sslCertificate,
            errorResponses: [
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: Duration.seconds(0),
                },
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: Duration.seconds(0),
                },
            ],
        });
    }

    private createDnsRecords(distribution: Distribution) {
        const { scope, hostedZone, environment } = this.props;
        const domainPrefix = environment === 'pro' ? '' : `${environment}.`;

        const mainRecordName = domainPrefix ? domainPrefix.slice(0, -1) : '';

        new ARecord(scope, `${environment}-WebsiteAliasRecord`, {
            zone: hostedZone,
            target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
            recordName: mainRecordName,
        });

        if (mainRecordName) {
            new ARecord(scope, `${environment}-WebsiteWwwAliasRecord`, {
                zone: hostedZone,
                target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
                recordName: `www.${mainRecordName}`,
            });
        }
    }

}