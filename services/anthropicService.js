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
        system: systemPrompt || "You are a medical-legal report analyzer. When presented with a medical report, carefully extract and summarize all available information, even if it requires careful reading between sections. Look for information throughout the entire report as important details may be mentioned in different sections.",
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
