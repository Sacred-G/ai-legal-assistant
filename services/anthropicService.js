import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function generateResponse(message, context, systemPrompt) {
  try {
    // Extract base64 data from context
    let pdfData = context?.base64 || context;

    // If no PDF data, just send the message as text
    if (!pdfData) {
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        system: systemPrompt || `You are a medical-legal report analyzer. Format your response in a clean, structured manner following these guidelines:

FORMATTING RULES:
1. Use clear section headers with numbers (e.g., "1. PATIENT DEMOGRAPHICS")
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

RATING DISPLAY FORMAT:
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
- Age at Date of Injury`,
        messages: [{ role: "user", content: message }]
      });
      return response.content[0].text;
    }

    console.log('Generating Anthropic response...', {
      hasContext: !!context,
      contextLength: pdfData?.length || 0,
      contextType: typeof pdfData,
      message
    });

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      system: systemPrompt || "You are a medical-legal report analyzer. When presented with a medical report, carefully extract and summarize all available information, even if it requires careful reading between sections. Look for information throughout the entire report as important details may be mentioned in different sections.",
      messages: [
        {
          role: "user",
          content: pdfData ? [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfData
              }
            },
            {
              type: "text",
              text: `When analyzing a medical-legal report, extract and summarize the available information in a clear, organized format. If information is missing, reason and think about it. It may be presented in slightly different terminology, but also consider implicit information that can be reasonably inferred from the context. For example, Injurys, impairment, and body part might mean the same thing.

Medical-Legal Report Summary

1. Patient Demographics and Employment Details
Extract any available information about:
- Patient Name
- Age/DOB
- Employer
- Occupation
- Employment Duration
- Insurance Carrier
- Claim Number
- Incident Date
- Current Work Status

2. Injury Claims
- Date(s) of injury
- Description of incident
- cumaltive trauma period and body part affected
- specific trauma perioud and body parts affected
- Mechanism of injury
- WPI % Rating for each body part

3. Prior Relevant Injuries
- Date of occurrence
- Description of incident
- Body parts affected
- Treatment received
- Outcome

4. Current Complaints by Body Part
For each affected body part mentioned in the report, note any details about:
- Symptoms
- Pain descriptions
- Impact on activities

5. Clinical Diagnoses
  - Diagnosis


6. Apportionment Determinations
Include if specified in the report:
- Any percentage breakdowns
- Reasoning provided

7. Work Restrictions and Limitations
Note any mentioned restrictions or limitations

8. Future Medical Care Recommendations
List any mentioned:
- Treatment recommendations
- Ongoing care needs

9. Vocational Findings and Recommendations
Include any vocational-related information if present

10. Unique or Notable Aspects
Note any significant information that doesn't fit the above categories

Important Notes:
- Maintain medical terminology as used in the report
- Focus on accuracy over completeness
- Do not use any markdown formatting or asterisks in your response
- Format section titles and text as plain text without any special characters
- Be sure to search entire report. For example Dental MMI and the WPI ratings for dental like MASTIFICATION IS NOT in the final review with the rest
- Dental information and wpi for dental will be seperate from the other body parts listed. Be sure the include all body parts and any wpi from the dental section

Present this information in a clear, hierarchical format using plain text headings and bullet points. Maintain medical terminology as used in the report but provide context where needed for understanding.

Important: Identify and include any unique or notable aspects of the report that fall outside these categories but appear significant to the case.

${message}`
            }
          ]
            : message
        }
      ],

    });

    console.log('Anthropic response received');
    if (!response.content || response.content.length === 0) {
      throw new Error('Invalid response format from Anthropic API');
    }
    return response.content[0].text;
  } catch (error) {
    console.error('Error generating Anthropic response:', error);
    console.error('Error details:', {
      message: error.message,
      type: error.type,
      status: error.status
    });
    throw error;
  }
}

export default { generateResponse };
