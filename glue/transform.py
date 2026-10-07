import sys

from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from pyspark.sql.functions import col


args = getResolvedOptions(
    sys.argv,
    [
        "JOB_NAME",
        "SOURCE_PATH",
        "TARGET_PATH",
    ],
)

source_path = args["SOURCE_PATH"]
target_path = args["TARGET_PATH"].rstrip("/")

print(f"Source path: {source_path}")
print(f"Target path: {target_path}")


sc = SparkContext()
glue_context = GlueContext(sc)
spark = glue_context.spark_session

job = Job(glue_context)
job.init(args["JOB_NAME"], args)


# Read CSV from the raw S3 bucket.
# transformation_ctx enables Glue Job Bookmarks.
source_dynamic_frame = glue_context.create_dynamic_frame.from_options(
    connection_type="s3",
    connection_options={
        "paths": [source_path],
    },
    format="csv",
    format_options={
        "withHeader": True,
        "separator": ",",
    },
    transformation_ctx="source_dynamic_frame",
)


print(f"Records read: {source_dynamic_frame.count()}")


# Convert DynamicFrame to Spark DataFrame.
df = source_dynamic_frame.toDF()


print("Source schema:")
df.printSchema()

print("Sample source records:")
df.show(10, truncate=False)


# Explicitly convert numeric columns.
df = (
    df
    .withColumn("year", col("year").cast("long"))
    .withColumn("month", col("month").cast("long"))
    .withColumn("grade", col("grade").cast("double"))
    .withColumn("attendance", col("attendance").cast("double"))
)


print("Transformed schema:")
df.printSchema()

print("Sample transformed records:")
df.show(10, truncate=False)


# Validate partition columns before writing.
null_partitions = df.filter(
    col("year").isNull() | col("month").isNull()
).count()

if null_partitions > 0:
    raise ValueError(
        f"Found {null_partitions} records with null year or month values."
    )


print("Partition columns validated successfully.")


output_path = f"{target_path}/academic_data"

print(f"Output path: {output_path}")
print("Writing partitioned Parquet data...")


# Write Parquet partitioned by year and month.
df.write \
    .mode("append") \
    .partitionBy("year", "month") \
    .parquet(output_path)


print("Partitioned Parquet data written successfully.")


job.commit()

print("Glue Job completed successfully.")
