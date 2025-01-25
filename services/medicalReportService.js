import assistantsService from './assistantsService.js';
import pdrService from './pdrService.js';

const ANALYSIS_PROMPT = `Please analyze this medical report and extract ALL information in this EXACT format for California PDRS calculations:

{
  "demographics": {
    "name": "Patient's full name",
    "dateOfBirth": "YYYY-MM-DD",
    "dateOfInjury": "YYYY-MM-DD",
    "occupation": {
      "title": "Exact occupation title as listed in report",
      "duties": "Description of job duties if provided",
      "industry": "Industry if mentioned"
    },
    "weeklyEarnings": 0
  },
  "impairments": [
    {
      "bodyPart": {
        "name": "Full body part name with side if applicable",
        "section": "Section number from AMA Guides (e.g., 15 for Spine)",
        "type": "Type of measurement (e.g., DRE, ROM, Strength)",
        "code": "Full impairment code (e.g., 15.03.01.00 for Lumbar DRE)"
      },
      "wpi": 0,
      "adjustments": {
        "pain": {
          "add": false,
          "description": "Pain-related impairment description if mentioned"
        },
        "adl": {
          "impacted": false,
          "description": "Activities of daily living impacts if mentioned"
        }
      },
      "apportionment": {
        "industrial": 100,
        "nonIndustrial": 0,
        "description": "Apportionment explanation if provided"
      },
      "futureMedial": {
        "required": false,
        "description": "Future medical needs if mentioned"
      }
    }
  ]
}

Important rules for PDRS calculations:
1. Return ONLY the JSON object, no other text
2. Include ALL found impairments as separate objects in the impairments array
3. For each impairment:
   - Match body part names and codes exactly to California PDRS system
   - Include section numbers for proper classification (e.g., 15 for Spine, 16 for Upper Extremities)
   - Note measurement type (DRE, ROM, etc.) for proper rating calculation
   - WPI must be a number (remove % symbol)
   - Document any pain add-ons for potential 3% increase
   - Note ADL impacts for potential adjustments
   - Apportionment must total 100% between industrial/non-industrial
4. For occupation:
   - Include exact job title for occupational group matching
   - Note specific duties that may affect disability rating
   - Include industry if specified for proper classification
5. All dates must be in YYYY-MM-DD format for age adjustment calculations
6. Include future medical needs for complete rating report

Use the file_search tool to thoroughly analyze all sections of the report, particularly focusing on:
- Diagnosis and impairment rating sections
- Work history and job description sections
- Apportionment discussion sections
- ADL and pain impact sections
- Future medical needs sections`;

class MedicalReportService {
    async processReport(fileBuffer, fileName, formData) {
        try {
            console.log('Processing medical report...');

            // Upload file and create thread
            const { fileId, threadId, assistantId } = await assistantsService.processFile(fileBuffer, fileName, 'rate');

            // Get analysis from assistant
            console.log('Requesting analysis from assistant...');
            const analysisResponse = await assistantsService.generateResponse(threadId, assistantId, ANALYSIS_PROMPT, fileId);

            // Parse the JSON response
            let reportData;
            try {
                // Find JSON object in the response
                const jsonMatch = analysisResponse.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error('No JSON found in response');
                }
                reportData = JSON.parse(jsonMatch[0]);
            } catch (error) {
                console.error('Error parsing assistant response:', error);
                throw new Error('Failed to parse analysis results');
            }

            // Add form data
            reportData.occupation = formData.occupation;
            if (!isNaN(formData.age)) {
                reportData.age = parseInt(formData.age);
            }

            // Calculate ratings using PDR service
            console.log('Calculating ratings...');
            const calculationResults = await pdrService.calculateRating(reportData);

            // Return formatted results
            return {
                ...calculationResults,
                occupation: reportData.occupation,
                name: reportData.name
            };
        } catch (error) {
            console.error('Error in medical report processing:', error);
            throw error;
        }
    }
}

export default new MedicalReportService();
