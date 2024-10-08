#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import { envs } from '../config/envs';

import { NetworkStack } from '../lib/network.stack';
import { SUEZMStack } from '../lib/suezm.stack';


const app = new cdk.App();

const AWS_REGION = envs.AWS_REGION;
const PROJECT_NAME = envs.PROJECT_NAME;
const PROJECT_DOMAIN = envs.PROJECT_DOMAIN;
const AWS_ACCOUNT_ID = envs.AWS_ACCOUNT_ID; 
const SSL_IDENTIFIER = envs.SSL_IDENTIFIER;

const networkStack = new NetworkStack(app, `${PROJECT_NAME}-NetworkStack`, {
    name: PROJECT_NAME,
    domainName: PROJECT_DOMAIN,
    sslIdentifier: SSL_IDENTIFIER,
    env: { region: AWS_REGION, account: AWS_ACCOUNT_ID, },
});

new SUEZMStack(app, `${PROJECT_NAME}-Stack`, {
  environment: 'pro',
  vpc: networkStack.vpc,
  domainName: PROJECT_DOMAIN,
  hostedZone: networkStack.hostedZone,
  sslCertificate: networkStack.sslCertificate,
  env: { region: AWS_REGION, account: AWS_ACCOUNT_ID, },
});

// new SUEZMStack(app, `${PROJECT_NAME}-Stack`, {
//   environment: 'stg',
//   vpc: networkStack.vpc,
//   domainName: PROJECT_DOMAIN,
//   hostedZone: networkStack.hostedZone,
//   sslCertificate: networkStack.sslCertificate,
//   env: { region: AWS_REGION, account: AWS_ACCOUNT_ID, },
// });

// new SUEZMStack(app, `${PROJECT_NAME}-Stack`, {
//   environment: 'dev',
//   vpc: networkStack.vpc,
//   domainName: PROJECT_DOMAIN,
//   hostedZone: networkStack.hostedZone,
//   sslCertificate: networkStack.sslCertificate,
//   env: { region: AWS_REGION, account: AWS_ACCOUNT_ID, },
// });