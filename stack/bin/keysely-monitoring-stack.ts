#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { KeyselyMonitoringStack } from "../lib/keysely-monitoring-stack";

const app = new cdk.App();

const region = app.node.tryGetContext("region") ?? process.env.CDK_DEFAULT_REGION ?? "eu-west-1";
const account = app.node.tryGetContext("account") ?? process.env.CDK_DEFAULT_ACCOUNT;
const monitoringNamespace = app.node.tryGetContext("monitoringNamespace") ?? "monitoring";

new KeyselyMonitoringStack(app, "KeyselyMonitoringStack-dev", {
  envName: "dev",
  baseName: "keysely-mon-dev",
  monitoringNamespace,
  nodeCount: Number(app.node.tryGetContext("devNodeCount") ?? 2),
  instanceType: app.node.tryGetContext("devInstanceType") ?? "t3.large",
  env: { account, region },
});

new KeyselyMonitoringStack(app, "KeyselyMonitoringStack-prod", {
  envName: "prod",
  baseName: "keysely-mon-prod",
  monitoringNamespace,
  nodeCount: Number(app.node.tryGetContext("prodNodeCount") ?? 3),
  instanceType: app.node.tryGetContext("prodInstanceType") ?? "t3.xlarge",
  env: { account, region },
});
