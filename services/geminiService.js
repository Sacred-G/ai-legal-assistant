import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateResponse(message, context) {
  try {
    console.log('Generating Gemini response...');
    console.log('Context length:', context?.length || 0);
    console.log('Message:', message);

    const model = genAI.getGenerativeModel({
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4000,
      }
    });

    const prompt = `You are a medical-legal report analyzer. When presented with a medical report, carefully extract and summarize all available information, even if it requires careful reading between sections. Look for information throughout the entire report as important details may be mentioned in different sections.

When analyzing a medical-legal report, extract and summarize the available information in a clear, organized format. If information is missing, reason and think about it. It may be presented in slightly different terminology, but also consider implicit information that can be reasonably inferred from the context. For example, Injurys, impairment, and body part might mean the same thing.

**Medical-Legal Report Summary**

1. **Patient Demographics and Employment Details**
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

2. **Injury Claims**
Identify any mentioned:
- Type of injury
- Date(s) of injury
- Body parts affected
- Mechanism of injury
- WPI % Rating for each body part

3. **Prior Relevant Injuries**
If mentioned in the report:
- Date of occurrence
- Description of incident
- Body parts affected
- Treatment received
- Outcome

4. **Current Complaints by Body Part**
For each affected body part mentioned in the report, note any details about:
- Symptoms
- Pain descriptions
- Impact on activities

5. **Clinical Diagnoses**
List any diagnoses mentioned in the report

6. **Apportionment Determinations**
Include if specified in the report:
- Any percentage breakdowns
- Reasoning provided

7. **Work Restrictions and Limitations**
Note any mentioned restrictions or limitations

8. **Future Medical Care Recommendations**
List any mentioned:
- Treatment recommendations
- Ongoing care needs

9. **Vocational Findings and Recommendations**
Include any vocational-related information if present

10. **Unique or Notable Aspects**
Note any significant information that doesn't fit the above categories

Important Notes:
- Only include information that is explicitly stated in the report
- Mark sections as "Not specified in the report" when information is absent
- Maintain medical terminology as used in the report
- Use "Not provided" or similar neutral language for missing information
- Focus on accuracy over completeness

Context:
${context}

User Message:
${message}`;

    console.log('Sending prompt to Gemini...');
    const result = await model.generateContent(prompt);
    console.log('Gemini response received');

    const response = await result.response;
    if (!response || !response.text) {
      throw new Error('Invalid response format from Gemini API');
    }

    return response.text();
  } catch (error) {
    console.error('Error generating Gemini response:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    throw error;
  }
}

export default { generateResponse };
