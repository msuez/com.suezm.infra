import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Certificate, ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone, IHostedZone } from 'aws-cdk-lib/aws-route53';

interface NetworkStackProps extends StackProps {
  name: string;
  domainName: string;
  sslIdentifier: string;
}

export class NetworkStack extends Stack {

  public readonly vpc: Vpc;
  public readonly hostedZone: IHostedZone;
  public readonly sslCertificate: ICertificate;

  private readonly props: NetworkStackProps;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    this.props = props;

    this.vpc = this.setupVPC();
    this.hostedZone = this.getHostedZone();
    this.sslCertificate = this.getSSLCertificate();

  }

  private setupVPC(): Vpc {
    const { name, } = this.props;
    const vpcFinalName = `${name}-VPC`;
    return new Vpc(
        this,
        vpcFinalName, {
        maxAzs: 2,
        vpcName: vpcFinalName,
        subnetConfiguration: [{
            name: "public-subnet",
            subnetType: SubnetType.PUBLIC,
        }, {
            name: "private-subnet",
            subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },],
    });
  }

  private getSSLCertificate() {
    const {
      env,
      name,
      sslIdentifier,
    } = this.props;
    const sslCertificate = Certificate.fromCertificateArn(
      this,
      `${name}-SSLCertificate`,
      `arn:aws:acm:${env?.region}:${env?.account}:certificate/${sslIdentifier}`,
    );
    return sslCertificate;
  }

  private getHostedZone() {
    const {
      name,
      domainName,
    } = this.props;
    const hostedZone = HostedZone.fromLookup(
      this,
      `${name}-HostedZone`, {
      domainName: domainName,
    });
    return hostedZone;
  }

}
