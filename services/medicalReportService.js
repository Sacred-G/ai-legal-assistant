import assistantsService from './assistantsService.js';
import pdrService from './pdrService.js';

const ANALYSIS_PROMPT = `You are a medical-legal report analyzer. Format your response in a clean, structured manner following these guidelines:

FORMATTING RULES:
1. Use clear section headers with numbers
2. Add a blank line between sections for readability
3. Use consistent indentation (2 spaces) for all subsections
4. Present information in a key-value format where applicable
5. Avoid special characters, markdown, or decorative elements
6. Use plain text formatting only

REPORT SECTIONS:

1. PATIENT DEMOGRAPHICS AND EMPLOYMENT
  MMI Status: [State if achieved]
  Patient Name: [Name]
  Age/DOB: [Age/Date]
  Employer: [Name]
  Occupation: [Title]
  Employment Duration: [Time]
  Insurance Carrier: [Name]
  Claim Number: [Number]
  Incident Date: [Date]
  Current Work Status: [Status]

2. INJURY CLAIMS
  Cumulative Trauma:
    Dates: [Dates]
    Body Parts: [List]
    Description: [Details]
  
  Specific Trauma:
    Date: [Date]
    Body Parts: [List]
    Mechanism: [Description]
    WPI Ratings: [Percentages by body part]

3. CURRENT COMPLAINTS
  List by body part:
    [Body Part]:
      Symptoms: [List]
      Pain Level/Description: [Details]
      Activity Impact: [Description]

4. CLINICAL DIAGNOSES
  Primary:
    Diagnosis: [Condition]
    Description: [Details]
  Secondary:
    [List additional diagnoses]

5. APPORTIONMENT
  Percentages: [List breakdowns]
  Reasoning: [Explanation]

6. WORK RESTRICTIONS
  Physical Limitations: [List]
  Activity Restrictions: [List]

7. FUTURE MEDICAL CARE
  Recommended Treatments: [List]
  Ongoing Care Needs: [Details]

8. VOCATIONAL FINDINGS
  Current Capacity: [Details]
  Recommendations: [List]

9. RATING CALCULATIONS
  Base WPI Calculation:
    - Multiply initial WPI by 1.4 for base rating

  Occupational Adjustments:
    Light Work (Category C):
      0.05 standard = 0.03 adjusted
      0.10 standard = 0.07 adjusted
      0.15 standard = 0.11 adjusted
      0.20 standard = 0.15 adjusted
      0.25 standard = 0.18 adjusted
      0.30 standard = 0.23 adjusted
      0.35 standard = 0.27 adjusted
      0.40 standard = 0.32 adjusted
      0.45 standard = 0.36 adjusted
      0.50 standard = 0.41 adjusted

    Medium Work (Category F):
      - Maintains standard rating (no adjustment)

    Heavy Work (Category J):
      0.05 standard = 0.09 adjusted
      0.10 standard = 0.16 adjusted
      0.15 standard = 0.23 adjusted
      0.20 standard = 0.29 adjusted
      0.25 standard = 0.36 adjusted
      0.30 standard = 0.41 adjusted
      0.35 standard = 0.47 adjusted
      0.40 standard = 0.52 adjusted
      0.45 standard = 0.58 adjusted
      0.50 standard = 0.62 adjusted

  Age Adjustments:
    Under 30: Decrease rating by 0.1 (10%)
    30-34: No adjustment (baseline)
    35-39: Add 0.1 (10%)
    40-44: Add 0.2 (20%)
    45-49: Add 0.3 (30%)
    50-54: Add 0.4 (40%)
    55-59: Add 0.5 (50%)
    60+: Add 0.6 (60%)

  Key Calculation Rules:
    1. Start with base WPI and multiply by 1.4
    2. Apply occupational adjustment based on work category
    3. Apply pain add-on if specified (3% standard) to the base WPI before multiplying by 1.4
    4. Apply age adjustment additively to the rating
    5. Maximum age adjustment is 0.6 (60%)
    6. Minimum age adjustment is -0.1 (-10%)
    7. Values between listed points can be interpolated linearly
    8. Maximum final adjustment caps at 0.62 (62%)

10. NOTABLE ASPECTS
  Additional Findings: [List any significant information]

RATING DISPLAY FORMAT: Below is an EXAMPLE. DO NOT USE THE VALUES, ONLY USE THE FORMAT.
Example ratings with calculations:

Permanent Disability Ratings
Cervical Spine (100% Industrial)
100% - 15.01.02.02 - 18 - [1.4] 25 - 470H - 28 - 30% DRE Category III with radiculopathy

Format: Industrial% - code - base WPI - [1.4] adjusted WPI - group/variant - occupational adjusted - final% Description

Each rating should show:
1. Body part with industrial percentage
2. Complete impairment code
3. Base WPI
4. 1.4 multiplier result
5. Group and variant
6. Occupational adjustment
7. Final percentage
8. Detailed medical description

Example Combined Values:
30 C 25 C 15 = 56%
Total Combined Rating: 56%

Summary Details:
- Total Pain Add-ons
- Weekly PD Rate
- Average Weekly Earnings
- Total PD Payout
- Age at Date of Injury

After analyzing the report in this format, provide a JSON object with the following structure:

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

Important rules for JSON output:
1. Include ALL found impairments as separate objects in the impairments array
2. Match body part names and codes exactly to California PDRS system
3. Include section numbers for proper classification
4. Note measurement type (DRE, ROM, etc.) for proper rating calculation
5. WPI must be a number (remove % symbol)
6. Document any pain add-ons for potential 3% increase
7. Note ADL impacts for potential adjustments
8. Apportionment must total 100% between industrial/non-industrial
9. All dates must be in YYYY-MM-DD format for age adjustment calculations`;

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
