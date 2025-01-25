import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function insertMedicalData(data) {
    try {
        const { data: result, error } = await supabase
            .from('medical_inputs')
            .insert([{
                name: data.name,
                age: data.age,
                date_of_injury: data.dateOfInjury,
                body_parts: data.bodyParts,
                raw_report: data.rawReport
            }])
            .select()
            .single();

        if (error) throw error;
        return result;
    } catch (error) {
        console.error('Error inserting medical data:', error);
        throw error;
    }
}

export async function getCalculationResults(medicalInputId) {
    try {
        const { data, error } = await supabase
            .from('calculation_results')
            .select('*')
            .eq('medical_input_id', medicalInputId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching calculation results:', error);
        throw error;
    }
}

export async function insertCalculatorInput(inputData) {
    try {
        console.log('Preparing to insert calculator input:', {
            name: inputData.name,
            age: inputData.age,
            dateOfInjury: inputData.dateOfInjury,
            bodyPartsCount: Object.keys(inputData.bodyParts).length
        });

        const insertData = {
            name: inputData.name,
            age: inputData.age,
            date_of_injury: inputData.dateOfInjury,
            occupation: inputData.occupation,
            group_number: inputData.groupNumber,
            body_parts: inputData.bodyParts,
            raw_report: inputData.rawReport || '',
            weekly_earnings: inputData.weeklyEarnings || 0
        };

        console.log('Inserting data into medical_inputs:', insertData);

        const { data, error } = await supabase
            .from('medical_inputs')
            .insert([insertData])
            .select()
            .single();

        if (error) {
            console.error('Supabase insert error:', error);
            throw error;
        }

        console.log('Successfully inserted calculator input:', data);
        return data;
    } catch (error) {
        console.error('Error inserting calculator input:', error);
        throw error;
    }
}

export async function getCompleteRatingResults(inputId) {
    try {
        console.log('Fetching rating results for input ID:', inputId);

        const { data, error } = await supabase
            .from('complete_rating_results')
            .select('*')
            .eq('id', inputId)
            .single();

        if (error) {
            console.error('Supabase fetch error:', error);
            throw error;
        }

        if (data) {
            console.log('Successfully retrieved rating results:', {
                id: data.id,
                noApportionmentTotal: data.no_apportionment?.total,
                withApportionmentTotal: data.with_apportionment?.total,
                pdWeeklyRate: data.pd_weekly_rate,
                totalPdPayout: data.total_pd_payout
            });
        } else {
            console.log('No results found for input ID:', inputId);
        }

        return data;
    } catch (error) {
        console.error('Error fetching complete rating results:', error);
        throw error;
    }
}
