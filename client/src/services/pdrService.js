import api from '../config/api';

export async function insertMedicalData(data) {
    try {
        const response = await api.post('/pdr/medical-input', {
            name: data.name,
            age: data.age,
            dateOfInjury: data.dateOfInjury,
            occupation: data.occupation,
            bodyParts: data.bodyParts,
            rawReport: data.rawReport,
            weeklyEarnings: data.weeklyEarnings || 0
        });
        return response.data;
    } catch (error) {
        console.error('Error inserting medical data:', error);
        throw error;
    }
}

export async function getCalculationResults(inputId) {
    try {
        const response = await api.get(`/api/pdr/history/${inputId}`);
        return response.data;
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

        const response = await api.post('/pdr/medical-input', {
            name: inputData.name,
            age: inputData.age,
            dateOfInjury: inputData.dateOfInjury,
            occupation: inputData.occupation,
            bodyParts: inputData.bodyParts,
            rawReport: inputData.rawReport || '',
            weeklyEarnings: inputData.weeklyEarnings || 0
        });

        console.log('Successfully inserted calculator input:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error inserting calculator input:', error);
        throw error;
    }
}

export async function getCompleteRatingResults(inputId) {
    try {
        console.log('Fetching rating results for input ID:', inputId);

        const response = await api.get(`/pdr/history/${inputId}`);
        const data = response.data;

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

export async function getOccupationGroup(occupation) {
    try {
        const response = await api.get(`/pdr/occupation-group/${encodeURIComponent(occupation)}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching occupation group:', error);
        throw error;
    }
}

export async function getImpairmentDetails(code) {
    try {
        const response = await api.get(`/pdr/impairment/${encodeURIComponent(code)}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching impairment details:', error);
        throw error;
    }
}

export async function getRatingHistory() {
    try {
        const response = await api.get('/pdr/history');
        return response.data;
    } catch (error) {
        console.error('Error fetching rating history:', error);
        throw error;
    }
}
