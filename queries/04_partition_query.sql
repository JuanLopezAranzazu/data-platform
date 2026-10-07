-- Average grade by course for a specific partition
-- Uses year/month partition pruning

SELECT
    year,
    month,
    course,
    ROUND(AVG(grade), 2) AS average_grade
FROM academic_data
WHERE year = '2025'
  AND month = '7'
GROUP BY year, month, course
ORDER BY average_grade DESC;