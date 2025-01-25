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
    const { data, error } = await supabase
      .from('medical_inputs')
      .insert([{
        name: inputData.name,
        age: inputData.age,
        date_of_injury: inputData.dateOfInjury,
        body_parts: inputData.bodyParts,
        raw_report: inputData.rawReport || ''
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error inserting calculator input:', error);
    throw error;
  }
}

export async function getCompleteRatingResults(inputId) {
  try {
    const { data, error } = await supabase
      .from('complete_rating_results')
      .select('*')
      .eq('id', inputId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching complete rating results:', error);
    throw error;
  }
}
