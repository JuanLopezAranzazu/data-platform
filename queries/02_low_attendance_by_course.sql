-- Number of low-attendance records by course
-- Full table scan: baseline analytical query

SELECT
    course,
    COUNT(*) AS low_attendance_records
FROM academic_data
WHERE attendance < 70
GROUP BY course
ORDER BY low_attendance_records DESC;