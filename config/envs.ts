
import 'dotenv/config';
import {get} from 'env-var';

export const envs = {
    PROJECT_NAME: get('PROJECT_NAME').required().asString(),
    AWS_REGION: get('AWS_REGION').required().asString(),
    PROJECT_DOMAIN: get('PROJECT_DOMAIN').required().asString(),
    AWS_ACCOUNT_ID: get('AWS_ACCOUNT_ID').required().asString(),
    SSL_IDENTIFIER: get('SSL_IDENTIFIER').required().asString(),
};