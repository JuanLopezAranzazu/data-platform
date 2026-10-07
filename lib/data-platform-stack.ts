import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as iam from "aws-cdk-lib/aws-iam";
import * as glue from "aws-cdk-lib/aws-glue";

export class DataPlatformStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Raw data bucket - stores original CSV files
    const rawBucket = new s3.Bucket(this, "RawDataBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Processed data bucket - stores transformed Parquet files
    const processedBucket = new s3.Bucket(this, "ProcessedDataBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Upload Glue ETL script to S3
    new s3deploy.BucketDeployment(this, "GlueScriptDeployment", {
      sources: [s3deploy.Source.asset("glue")],
      destinationBucket: rawBucket,
      destinationKeyPrefix: "scripts",
    });

    // IAM role assumed by AWS Glue
    const glueRole = new iam.Role(this, "GlueJobRole", {
      assumedBy: new iam.ServicePrincipal("glue.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSGlueServiceRole",
        ),
      ],
    });

    // Glue permissions
    rawBucket.grantRead(glueRole);
    processedBucket.grantReadWrite(glueRole);

    // Glue ETL Job
    new glue.CfnJob(this, "AcademicDataTransformJob", {
      name: "academic-data-transform",

      role: glueRole.roleArn,

      command: {
        name: "glueetl",
        pythonVersion: "3",
        scriptLocation: `s3://${rawBucket.bucketName}/scripts/transform.py`,
      },

      glueVersion: "4.0",

      workerType: "G.1X",
      numberOfWorkers: 2,

      defaultArguments: {
        "--job-language": "python",
        "--SOURCE_PATH": `s3://${rawBucket.bucketName}/academic_data.csv`,
        "--TARGET_PATH": `s3://${processedBucket.bucketName}/`,
        "--enable-metrics": "",
        "--enable-continuous-cloudwatch-log": "true",
      },

      executionProperty: {
        maxConcurrentRuns: 1,
      },
    });

    // Stack outputs
    new cdk.CfnOutput(this, "RawBucketName", {
      value: rawBucket.bucketName,
    });

    new cdk.CfnOutput(this, "ProcessedBucketName", {
      value: processedBucket.bucketName,
    });
  }
}
