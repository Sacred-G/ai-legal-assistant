import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// List available models
async function listModels() {
  try {
    const models = await openai.models.list();
    console.log('Available models:', models.data.length);
    models.data.forEach(model => {
      console.log(`- ${model.id}`);
    });
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

// Call listModels on startup
listModels();

// Rough estimate of tokens (OpenAI uses ~4 chars per token)
function estimateTokenCount(text) {
  return Math.ceil(text.length / 4);
}

async function generateResponse(message, context) {
  try {
    console.log('Generating OpenAI response with:', {
      messageLength: message?.length,
      contextLength: context?.length,
      contextPreview: context?.substring(0, 200) + '...',
      hasContext: !!context
    });

    if (!context) {
      console.warn('No context provided to OpenAI service');
      return 'Please upload a PDF document first to provide context for analysis.';
    }

    const instructions = `You are a medical-legal report analyzer. Format your response in a clean, structured manner following these guidelines:

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

4. CURRENT COMPLAINTS
  List by body part:
    [Body Part]:
      Symptoms: [List]
      Pain Level/Description: [Details]
      Activity Impact: [Description]

5. CLINICAL DIAGNOSES
  Primary:
    Diagnosis: [Condition]
    Description: [Details]
  Secondary:
    [List additional diagnoses]

6. APPORTIONMENT
  Percentages: [List breakdowns]
  Reasoning: [Explanation]

7. WORK RESTRICTIONS
  Physical Limitations: [List]
  Activity Restrictions: [List]

8. FUTURE MEDICAL CARE
  Recommended Treatments: [List]
  Ongoing Care Needs: [Details]

9. VOCATIONAL FINDINGS
  Current Capacity: [Details]
  Recommendations: [List]

10. RATING CALCULATIONS: Very IMPORTANT. CHECK YOUR CALCULATIONS. DETERMINE IF THEY MAKE SENSE AND IF NOT, USE REASONING TO DETERMINE WHY NOT AND REWRITE THE RATING STRING.
  Base WPI Calculation:
    - Multiply initial WPI(up to 3%) by 1.4 for base rating
    - Every rating string will have a occupational adjustment and age adjustment
    - Use this format for every rating string and just the format. Each report will be different and have different ratings 15.01.02.02 - 18 - [1.4] 25 - 470H - 28 - 30% DRE Category III with radiculopathy
    - dont show the calculations just show the rating string in the above format.. This is very important..
    - Below you have a list of occupational group number (110-590) and their most common variant each rating string wiill need a group number and variant like this 360G or 470H.
    - Rating string = 15.01.02.02 - 18 - [1.4] 25 - 470H - 28 - 30%
    - Take the Base WPI from report and add any pain_wpi up to 3% then multiply to get the adjusted WPI. Base WPI is 18 multiplied by 1.4 = 25.2 then use the charts below of the occupational and age adjustment modifier but dont list calculations in the rating string.  Just the group number and variant and occupational value and then the age justment value which is your final value.


  Occupational Groups and Common Variants:
    Group 110: Spine C, variant: Spine C
    Group 111: Spine C, variant: Wrist G
    Group 112: Spine D, variant: Wrist H
    Group 120: Spine D, variant: Wrist H
    Group 210: Spine D, variant: Psych I
    Group 211: Spine D, variant: Wrist G
    Group 212: Spine E, variant: Psych J
    Group 213: Spine F, variant: Leg F
    Group 214: Spine F, variant: Spine F
    Group 220: Spine E, variant: Wrist H
    Group 221: Spine E, variant: Wrist G
    Group 230: Spine E, variant: Finger Motion G
    Group 240: Spine E, variant: Leg E
    Group 250: Spine F, variant: Spine F
    Group 251: Spine E, variant: Leg E
    Group 290: Spine E, variant: Wrist H
    Group 310: Spine F, variant: Grip F
    Group 311: Spine G, variant: Spine G
    Group 320: Spine F, variant: Wrist I
    Group 321: Spine F, variant: Grip G
    Group 322: Spine F, variant: Wrist G
    Group 330: Spine F, variant: Grip G
    Group 331: Spine F, variant: Grip F
    Group 332: Spine F, variant: Wrist E
    Group 340: Spine G, variant: Leg G
    Group 341: Spine G, variant: Spine G
    Group 350: Spine G, variant: Leg G
    Group 351: Spine G, variant: Leg G
    Group 360: Spine G, variant: Leg G
    Group 370: Spine G, variant: Wrist J
    Group 380: Spine H, variant: Leg I
    Group 390: Spine G, variant: Leg H
    Group 420: Spine H, variant: Grip H
    Group 430: Spine H, variant: Leg H
    Group 460: Spine H, variant: Leg H
    Group 470: Spine H, variant: Wrist J
    Group 480: Spine I, variant: Leg H
    Group 481: Spine I, variant: Leg I
    Group 482: Spine J, variant: Leg J
    Group 490: Spine I, variant: Leg I
    Group 491: Spine H, variant: Leg H
    Group 492: Spine I, variant: Leg I
    Group 560: Spine J, variant: Leg I
    Group 590: Spine J, variant: Leg J

  Key Calculation Rules:
    1. Start with base WPI and multiply by 1.4
    2. Apply occupational adjustment based on work category
    3. Apply pain add-on if specified (3% standard) to the base WPI before multiplying by 1.4
    4. Apply age adjustment additively to the rating
    5. Maximum age adjustment is 0.6 (60%)
    6. Minimum age adjustment is -0.1 (-10%)
    7. Values between listed points can be interpolated linearly (variants C to J)
    8. Maximum final adjustment caps at 0.62 (62%)

11. NOTABLE ASPECTS
  Additional Findings: [List any significant information]

When analyzing the report, extract information carefully and present it in this structured format. Maintain medical terminology as used in the report. For any WPI ratings, show both the base WPI and the final adjusted rating after applying all adjustments.

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

Here is a section of a medical report to analyze using the above format:\n\n${context}\n\nUser Question: ${message}`;

    // Estimate token count
    const totalTokens = estimateTokenCount(instructions);

    console.log('Estimated tokens:', {
      total: totalTokens
    });

    const response = await openai.chat.completions.create({
      model: "o1-preview",
      messages: [
        {
          role: "user",
          content: instructions
        }
      ]
    });

    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      throw new Error('Invalid response format from OpenAI API');
    }

    // Process the response to ensure consistent formatting
    let formattedResponse = response.choices[0].message.content;

    // Ensure consistent line spacing
    formattedResponse = formattedResponse
      .replace(/\n{3,}/g, '\n\n') // Replace multiple blank lines with double line break
      .replace(/^\s+|\s+$/g, '') // Trim whitespace at start and end
      .split('\n')
      .map(line => {
        // Ensure consistent indentation
        if (line.match(/^\d+\./)) {
          return `\n${line}`; // Add extra line break before numbered sections
        }
        return line;
      })
      .join('\n');

    return formattedResponse;
  } catch (error) {
    console.error('Error generating OpenAI response:', error);
    console.error('Error details:', {
      message: error.message,
      type: error.type,
      status: error.status
    });
    throw error;
  }
}

export default { generateResponse };
