-- Average grade by course
-- Full table scan: baseline analytical query

SELECT
    course,
    ROUND(AVG(grade), 2) AS average_grade
FROM academic_data
GROUP BY course
ORDER BY average_grade DESC;