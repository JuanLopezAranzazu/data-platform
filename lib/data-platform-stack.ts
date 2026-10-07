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
    const glueScriptDeployment = new s3deploy.BucketDeployment(
      this,
      "GlueScriptDeployment",
      {
        sources: [s3deploy.Source.asset("glue")],
        destinationBucket: rawBucket,
        destinationKeyPrefix: "scripts",
      },
    );

    // IAM role assumed by AWS Glue ETL Job
    const glueJobRole = new iam.Role(this, "GlueJobRole", {
      assumedBy: new iam.ServicePrincipal("glue.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSGlueServiceRole",
        ),
      ],
    });

    // Glue ETL permissions
    rawBucket.grantRead(glueJobRole);
    processedBucket.grantReadWrite(glueJobRole);

    // Glue ETL Job
    const glueJob = new glue.CfnJob(this, "AcademicDataTransformJob", {
      name: "academic-data-transform",

      role: glueJobRole.roleArn,

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

    // Ensure the Glue script is deployed before creating the Glue Job
    glueJob.node.addDependency(glueScriptDeployment);

    // Glue Data Catalog database
    const database = new glue.CfnDatabase(this, "AcademicDataDatabase", {
      catalogId: this.account,
      databaseInput: {
        name: "academic_data_catalog",
        description: "Data Catalog for academic educational data",
      },
    });

    // IAM role assumed by the Glue Crawler
    const crawlerRole = new iam.Role(this, "GlueCrawlerRole", {
      assumedBy: new iam.ServicePrincipal("glue.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSGlueServiceRole",
        ),
      ],
    });

    // Allow the crawler to read processed Parquet data
    processedBucket.grantRead(crawlerRole);

    // Glue Crawler
    const crawler = new glue.CfnCrawler(this, "AcademicDataCrawler", {
      name: "academic-data-crawler",

      role: crawlerRole.roleArn,

      databaseName: database.ref,

      targets: {
        s3Targets: [
          {
            path: `s3://${processedBucket.bucketName}/academic_data/`,
          },
        ],
      },

      schemaChangePolicy: {
        updateBehavior: "UPDATE_IN_DATABASE",
        deleteBehavior: "DEPRECATE_IN_DATABASE",
      },

      recrawlPolicy: {
        recrawlBehavior: "CRAWL_EVERYTHING",
      },

      configuration: JSON.stringify({
        Version: 1.0,
        CrawlerOutput: {
          Partitions: {
            AddOrUpdateBehavior: "InheritFromTable",
          },
        },
      }),
    });

    // Ensure the database exists before the crawler
    crawler.addDependency(database);

    // Stack outputs
    new cdk.CfnOutput(this, "RawBucketName", {
      value: rawBucket.bucketName,
    });

    new cdk.CfnOutput(this, "ProcessedBucketName", {
      value: processedBucket.bucketName,
    });

    new cdk.CfnOutput(this, "GlueDatabaseName", {
      value: database.ref,
    });

    new cdk.CfnOutput(this, "GlueCrawlerName", {
      value: crawler.ref,
    });
  }
}
