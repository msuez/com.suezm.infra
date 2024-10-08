import { Construct } from "constructs";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { Stack, StackProps, } from 'aws-cdk-lib';
import { IHostedZone, } from "aws-cdk-lib/aws-route53";
import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";

import {
    Webapp,
    Backend,
} from '../components/';

interface SUEZMStackProps extends StackProps {
    vpc: Vpc;
    domainName: string;
    hostedZone: IHostedZone;
    sslCertificate: ICertificate;
    environment: 'dev' | 'stg' | 'pro';
}

export class SUEZMStack extends Stack {

    private readonly props: SUEZMStackProps;

    constructor(scope: Construct, id: string, props: SUEZMStackProps) {
        super(scope, id, props);

        this.props = props;

        console.log(`Deploying ${props.environment} environment`);
        this.init();
        console.log(`Deployed ${props.environment} environment`);

    }

    private init() {
        const webapp = new Webapp({
            scope: this,
            domainName: this.props.domainName,
            hostedZone: this.props.hostedZone,
            environment: this.props.environment,
            sslCertificate: this.props.sslCertificate,
        });

        const backend = new Backend({
            scope: this,
            vpc: this.props.vpc,
            domainName: this.props.domainName,
            hostedZone: this.props.hostedZone,
            environment: this.props.environment,
            sslCertificate: this.props.sslCertificate,
        });

        webapp.start();
        backend.start();
    }

}