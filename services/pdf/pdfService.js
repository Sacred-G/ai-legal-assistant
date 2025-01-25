import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { createCanvas } from 'canvas';

// Configure pdf.js for Node environment
GlobalWorkerOptions.disableWorker = true;

// Create custom canvas factory for Node.js
const NodeCanvasFactory = {
  create(width, height) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    return {
      canvas,
      context,
    };
  },

  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  },

  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
};

function formatMedicalReport(text) {
  const sections = text.split(/\n{2,}/);
  let formatted = [];

  sections.forEach(section => {
    if (!section.trim()) return;

    // Handle Clinical Diagnoses section
    if (section.includes('Clinical Diagnoses')) {
      formatted.push('CLINICAL DIAGNOSES:');
      const diagnoses = section.split('\n')
        .filter(line => line.trim() && !line.includes('Clinical Diagnoses'))
        .map(line => `    ${line.trim()}`);
      formatted.push(diagnoses.join('\n'));
      return;
    }

    // Handle Apportionment section
    if (section.includes('Apportionment Determinations')) {
      formatted.push('APPORTIONMENT DETERMINATIONS:');
      const apportionment = section.split('\n')
        .filter(line => line.trim() && !line.includes('Apportionment Determinations'))
        .map(line => {
          line = line.replace(/\*\*/g, '');
          if (line.includes(':')) {
            const [header, content] = line.split(':');
            return `${header}:${content ? ' ' + content.trim() : ''}`;
          }
          return `    ${line.trim()}`;
        });
      formatted.push(apportionment.join('\n'));
      return;
    }

    // Handle Symptoms sections
    if (section.includes('**')) {
      const lines = section.split('\n').filter(l => l.trim());
      let bodyPart = '';

      // Check for body part header
      if (lines[0].includes('Bilateral') || lines[0].includes('Right') || lines[0].includes('Left')) {
        bodyPart = lines[0].replace(/\*\*/g, '').trim() + ':';
        lines.shift();
      }

      if (bodyPart) {
        formatted.push(bodyPart);
      }

      const formattedLines = lines.map(line => {
        line = line.replace(/\*\*/g, '');
        // Check if it's a header line
        if (line.includes(':')) {
          const [header, content] = line.split(':');
          return `${header}:${content ? '\n        ' + content.trim() : ''}`;
        }
        return `        ${line.trim()}`;
      });

      formatted.push(formattedLines.join('\n'));
      return;
    }

    // Default formatting for other sections
    formatted.push(section.replace(/\*\*/g, ''));
  });

  return formatted.join('\n\n');
}

export async function extractTextFromPDF(buffer) {
  try {
    // Load PDF document first
    const data = new Uint8Array(buffer);
    const loadingTask = getDocument({
      data,
      canvasFactory: NodeCanvasFactory,
      isEvalSupported: false,
      disableFontFace: true
    });
    const pdf = await loadingTask.promise;

    // Extract text from all pages
    const textContent = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map(item => item.str).join(' ');
      textContent.push(text);
    }

    // Clean and format text
    const cleanedText = textContent
      .join('\n')
      .replace(/\s{3,}/g, '\n')
      .replace(/Page \d+ of \d+/g, '')
      .replace(/\[object Object\]/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Format the text if it's a medical report
    const formattedText = formatMedicalReport(cleanedText);

    return {
      text: formattedText,
      pages: pdf.numPages,
      // Convert to URL-safe base64 after successful PDF load
      base64: Buffer.from(buffer).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
    };
  } catch (error) {
    console.error('Error extracting text from PDF:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });

    // Provide more specific error messages
    if (error.name === 'InvalidPDFException') {
      throw new Error('The PDF file is invalid or corrupted');
    } else if (error.message.includes('Worker')) {
      throw new Error('PDF worker initialization failed. Please try again');
    } else {
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }
}
