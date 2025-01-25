-- Test case for medical report data
INSERT INTO medical_inputs (
    name,
    age,
    date_of_injury,
    body_parts,
    raw_report
) VALUES (
    'John Doe',
    65,
    '2022-01-15',
    '{
        "Spine - Lumbar - ROM": {
            "impairmentCode": "15.03.02.05 - 15 - [1.4] 21 - 360G - 23 - 30%",
            "wpi": 30,
            "apportioned": false
        },
        "Right Upper Extremities - Shoulder": {
            "impairmentCode": "16.02.01.00 - 8 - [1.4] 11 - 360G - 13 - 17%",
            "wpi": 17,
            "apportioned": false
        },
        "Right Upper Extremities - Wrist": {
            "impairmentCode": "16.04.01.00 - 4 - [1.4] 6 - 360F - 6 - 8%",
            "wpi": 8,
            "apportioned": true
        },
        "Left Lower Extremities - Knee": {
            "impairmentCode": "17.05.05.00 - 7 - [1.4] 10 - 360G - 12 - 16%",
            "wpi": 16,
            "apportioned": true
        }
    }',
    'Test medical report content'
);

-- Verify the results
SELECT 
    mi.name,
    mi.age,
    mi.date_of_injury,
    cr.no_apportionment->>'total' as no_apportionment_total,
    cr.with_apportionment->>'total' as with_apportionment_total,
    cr.weekly_earnings,
    cr.pd_weekly_rate,
    cr.total_pd_payout,
    cr.life_weekly_rate,
    cr.calculation_formulas
FROM medical_inputs mi
JOIN calculation_results cr ON cr.medical_input_id = mi.id;
