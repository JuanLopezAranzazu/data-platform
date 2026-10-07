import sys

from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext


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

df = source_dynamic_frame.toDF()

print(f"Records read: {df.count()}")

output_path = f"{target_path}/academic_data"

print(f"Output path: {output_path}")

df.write.mode("overwrite").parquet(output_path)

job.commit()
