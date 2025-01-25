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

10. NOTABLE ASPECTS
  Additional Findings: [List any significant information]

When analyzing the report, extract information carefully and present it in this structured format. Maintain medical terminology as used in the report.

Here is a section of a medical report to analyze using the above format:\n\n${context}\n\nUser Question: ${message}`;

    // Estimate token count
    const totalTokens = estimateTokenCount(instructions);

    console.log('Estimated tokens:', {
      total: totalTokens
    });

    const response = await openai.chat.completions.create({
      model: "o1-mini",
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
