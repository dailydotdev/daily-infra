import * as pulumi from '@pulumi/pulumi';
import * as gcp from '@pulumi/gcp';
import * as inputs from '@pulumi/gcp/types/input';
import { Output } from '@pulumi/pulumi';

export const config = new pulumi.Config();
export const location = gcp.config.region || 'us-central1';
