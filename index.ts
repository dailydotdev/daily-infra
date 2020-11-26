import * as gcp from "@pulumi/gcp";
import {config, location} from "./helpers";

const projectNumber = config.get('projectNumber');

// Enable Cloud Run
new gcp.projects.Service("EnableCloudRun", {
  service: "run.googleapis.com",
});

// Enable Secret Manager
new gcp.projects.Service("EnableSecretManager", {
  service: "secretmanager.googleapis.com",
});

// Enable Serverless VPC Access
const enableVPCAccess = new gcp.projects.Service("EnableVPCAccess", {
  service: "vpcaccess.googleapis.com",
});

export const serverlessVPC = new gcp.vpcaccess.Connector("ServerlessVPC", {
  name: 'serverless-vpc',
  region: location,
  network: 'default',
  ipCidrRange: '10.8.0.0/28',
}, {dependsOn: enableVPCAccess});

const besticon = new gcp.cloudrun.Service('besticon', {
  name: 'besticon',
  location,
  template: {
    metadata: {
      annotations: {
        'autoscaling.knative.dev/maxScale': '20',
      },
    },
    spec: {
      containers: [
        {
          image: 'gcr.io/daily-ops/iconserver:v3.12.0',
          resources: { limits: { cpu: '1', memory: '256Mi' } },
        },
      ],
    },
  },
});

new gcp.cloudrun.IamMember('besticon-public', {
  service: besticon.name,
  location,
  role: 'roles/run.invoker',
  member: 'allUsers',
});

// Integrate Pub/Sub with Cloud Run
new gcp.projects.IAMMember(`pubsub-token-creator`, {
  role: 'roles/iam.serviceAccountTokenCreator',
  member: `serviceAccount:service-${projectNumber}@gcp-sa-pubsub.iam.gserviceaccount.com`,
});

export const cloudRunPubSubInvoker = new gcp.serviceaccount.Account('cloud-run-pubsub-invoker-sa', {
  accountId: 'cloud-run-pubsub-invoker',
  displayName: 'Cloud Run Pub/Sub Invoker',
});

// Exclude Cloud Run 2xx and 3xx logs to reduce cost
new gcp.logging.ProjectExclusion('logging-exclusion-cloud-run', {
  description: 'Exclude Cloud Run invocation logs',
  name: 'cloud-run',
  filter: `resource.type = "cloud_run_revision" logName="projects/devkit-prod/logs/run.googleapis.com%2Frequests" httpRequest.status>=200 httpRequest.status<400`,
});

new gcp.logging.ProjectExclusion('logging-exclusion-cloud-run-404', {
  description: 'Exclude Cloud Run 404 invocation logs',
  name: 'cloud-run-404',
  filter: `resource.type = "cloud_run_revision" logName="projects/devkit-prod/logs/run.googleapis.com%2Frequests" httpRequest.status=404`,
});