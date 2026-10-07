# Athena Queries

SQL queries used to validate the educational data platform with Amazon Athena.

## Queries

| File                              | Description                                |
| --------------------------------- | ------------------------------------------ |
| `01_average_grade_by_course.sql`  | Average grade by course                    |
| `02_low_attendance_by_course.sql` | Low attendance records by course           |
| `03_average_grade_by_year.sql`    | Average grade by academic year             |
| `04_partition_query.sql`          | Query using `year/month` partition pruning |
| `05_partition_records.sql`        | Record count for a specific partition      |

## Database

```text
academic_data_catalog
```

## Table

```text
academic_data
```

The queries were tested successfully using the `academic-data-workgroup` Athena workgroup.
