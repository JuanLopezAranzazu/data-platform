-- Number of records in a specific partition
-- Uses year/month partition pruning

SELECT
    year,
    month,
    COUNT(*) AS records
FROM academic_data
WHERE year = '2024'
  AND month = '8'
GROUP BY year, month;