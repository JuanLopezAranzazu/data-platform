-- Average grade by academic year
-- Full table scan: baseline analytical query

SELECT
    year,
    ROUND(AVG(grade), 2) AS average_grade
FROM academic_data
GROUP BY year
ORDER BY year;