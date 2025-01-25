-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Medical inputs table to store extracted report data
CREATE TABLE medical_inputs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (age > 0 AND age < 150),
    date_of_injury DATE NOT NULL,
    body_parts JSONB NOT NULL,
    raw_report TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for date_of_injury for efficient querying
CREATE INDEX idx_medical_inputs_date ON medical_inputs(date_of_injury);

-- Calculation results table
CREATE TABLE calculation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medical_input_id UUID REFERENCES medical_inputs(id) ON DELETE CASCADE,
    no_apportionment JSONB NOT NULL,
    with_apportionment JSONB NOT NULL,
    weekly_earnings DECIMAL(10,2) NOT NULL DEFAULT 435.00,
    pd_weekly_rate DECIMAL(10,2) NOT NULL DEFAULT 290.00,
    total_pd_payout DECIMAL(10,2) NOT NULL,
    life_weekly_rate DECIMAL(10,2) NOT NULL DEFAULT 85.00,
    return_to_work_adjustments TEXT,
    calculation_formulas JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for medical_input_id for efficient joins
CREATE INDEX idx_calculation_results_medical_input ON calculation_results(medical_input_id);

-- Function to combine ratings using the Combined Values Chart
CREATE OR REPLACE FUNCTION combine_ratings(ratings DECIMAL[])
RETURNS DECIMAL AS $$
DECLARE
    result DECIMAL := 0;
    i INTEGER;
BEGIN
    IF array_length(ratings, 1) = 0 THEN
        RETURN 0;
    END IF;

    -- Sort ratings in descending order
    SELECT array_agg(x ORDER BY x DESC)
    INTO ratings
    FROM unnest(ratings) x;

    -- Start with the highest rating
    result := ratings[1];

    -- Combine subsequent ratings using the formula
    FOR i IN 2..array_length(ratings, 1) LOOP
        result := result + (ratings[i] * (1 - result/100));
    END LOOP;

    RETURN round(result::numeric, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate PD ratings and create result
CREATE OR REPLACE FUNCTION calculate_pd_ratings()
RETURNS TRIGGER AS $$
DECLARE
    result_record RECORD;
    body_part RECORD;
    no_apport_sections JSONB := '[]';
    with_apport_sections JSONB := '[]';
    no_apport_ratings DECIMAL[] := '{}';
    with_apport_ratings DECIMAL[] := '{}';
    total_no_apport DECIMAL := 0;
    total_with_apport DECIMAL := 0;
    calc_formulas JSONB;
BEGIN
    -- Validate body_parts JSON structure
    IF NOT (NEW.body_parts ? 'impairmentCode' OR jsonb_typeof(NEW.body_parts) = 'object') THEN
        RAISE EXCEPTION 'Invalid body_parts JSON structure';
    END IF;

    -- Process each body part
    FOR body_part IN SELECT * FROM jsonb_each(NEW.body_parts)
    LOOP
        -- Validate required fields
        IF NOT (body_part.value ? 'impairmentCode' AND body_part.value ? 'wpi') THEN
            RAISE EXCEPTION 'Missing required fields in body part data';
        END IF;

        -- Extract and validate rating
        IF NOT (body_part.value->>'wpi')::decimal BETWEEN 0 AND 100 THEN
            RAISE EXCEPTION 'Invalid WPI rating value';
        END IF;

        -- Sort into apportioned and non-apportioned sections
        IF (body_part.value->>'apportioned')::boolean THEN
            with_apport_sections := with_apport_sections || jsonb_build_object(
                'code', body_part.value->>'impairmentCode',
                'description', body_part.key,
                'rating', (body_part.value->>'wpi')::decimal
            );
            with_apport_ratings := with_apport_ratings || (body_part.value->>'wpi')::decimal;
        ELSE
            no_apport_sections := no_apport_sections || jsonb_build_object(
                'code', body_part.value->>'impairmentCode',
                'description', body_part.key,
                'rating', (body_part.value->>'wpi')::decimal
            );
            no_apport_ratings := no_apport_ratings || (body_part.value->>'wpi')::decimal;
        END IF;
    END LOOP;

    -- Calculate combined ratings
    total_no_apport := combine_ratings(no_apport_ratings);
    total_with_apport := combine_ratings(with_apport_ratings);

    -- Store calculation formulas
    calc_formulas := jsonb_build_object(
        'no_apportionment', CASE 
            WHEN array_length(no_apport_ratings, 1) > 0 
            THEN array_to_string(no_apport_ratings, ' C ') || ' = ' || total_no_apport::text
            ELSE NULL 
        END,
        'with_apportionment', CASE 
            WHEN array_length(with_apport_ratings, 1) > 0 
            THEN array_to_string(with_apport_ratings, ' C ') || ' = ' || total_with_apport::text
            ELSE NULL 
        END
    );

    -- Calculate total PD payout based on the higher rating
    -- Note: The 620 multiplier is an example, adjust according to actual requirements
    INSERT INTO calculation_results (
        medical_input_id,
        no_apportionment,
        with_apportionment,
        weekly_earnings,
        pd_weekly_rate,
        total_pd_payout,
        life_weekly_rate,
        return_to_work_adjustments,
        calculation_formulas
    ) VALUES (
        NEW.id,
        jsonb_build_object(
            'sections', no_apport_sections,
            'total', total_no_apport
        ),
        jsonb_build_object(
            'sections', with_apport_sections,
            'total', total_with_apport
        ),
        435.00, -- Default PD Statutory Max
        290.00, -- Default PD weekly rate
        GREATEST(total_no_apport, total_with_apport) * 620, -- Use higher rating for payout
        85.00, -- Default life weekly rate
        CASE 
            WHEN NEW.date_of_injury >= '2013-01-01' 
            THEN 'No RTW Adjustments for injuries on/after 1/1/2013'
            ELSE NULL 
        END,
        calc_formulas
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error details
        RAISE NOTICE 'Error in calculate_pd_ratings: %', SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS calculate_pd_ratings_trigger ON medical_inputs;

-- Create trigger to calculate ratings on medical input insert
CREATE TRIGGER calculate_pd_ratings_trigger
    AFTER INSERT ON medical_inputs
    FOR EACH ROW
    EXECUTE FUNCTION calculate_pd_ratings();

-- Create view for easy querying of complete results
CREATE OR REPLACE VIEW complete_rating_results AS
SELECT 
    mi.id,
    mi.name,
    mi.age,
    mi.date_of_injury,
    cr.no_apportionment,
    cr.with_apportionment,
    cr.weekly_earnings,
    cr.pd_weekly_rate,
    cr.total_pd_payout,
    cr.life_weekly_rate,
    cr.return_to_work_adjustments,
    cr.calculation_formulas
FROM medical_inputs mi
JOIN calculation_results cr ON cr.medical_input_id = mi.id;
