/**
 * Service for extracting structured data from medical reports
 */

/**
 * Extract demographics and key dates from report text
 */
function extractDemographics(text) {
  const demographics = {
    age: null,
    gender: null,
    occupation: null,
    dateOfInjury: null,
    dateOfExamination: null
  };

  // Extract age
  const ageMatch = text.match(/age[:\s]+(\d+)/i);
  if (ageMatch) {
    demographics.age = parseInt(ageMatch[1]);
  }

  // Extract gender
  const genderMatch = text.match(/(?:gender|sex)[:\s]+(male|female)/i);
  if (genderMatch) {
    demographics.gender = genderMatch[1].toLowerCase();
  }

  // Extract occupation
  const occupationMatch = text.match(/occupation[:\s]+([^.\n]+)/i);
  if (occupationMatch) {
    demographics.occupation = occupationMatch[1].trim();
  }

  // Extract dates
  const dateOfInjuryMatch = text.match(/date of injury[:\s]+([^.\n]+)/i);
  if (dateOfInjuryMatch) {
    demographics.dateOfInjury = dateOfInjuryMatch[1].trim();
  }

  const examDateMatch = text.match(/(?:date of examination|exam date)[:\s]+([^.\n]+)/i);
  if (examDateMatch) {
    demographics.dateOfExamination = examDateMatch[1].trim();
  }

  return demographics;
}

/**
 * Extract impairments with WPI ratings and pain add-ons
 */
function extractImpairments(text) {
  const impairments = [];

  // Look for WPI mentions
  const wpiRegex = /(?:WPI|whole person impairment)[:\s]+(\d+(?:\.\d+)?)\s*%/gi;
  const painRegex = /pain(?:\s+add-?on)?[:\s]+(\d+(?:\.\d+)?)\s*%/gi;

  // Find sections with body parts
  const sections = text.split(/\n{2,}/);

  sections.forEach(section => {
    // Look for body part headers
    const bodyPartMatch = section.match(/^(?:bilateral|right|left)?\s*([a-z\s]+):/i);
    if (!bodyPartMatch) return;

    const bodyPart = bodyPartMatch[1].trim();
    let wpi = null;
    let painAddon = null;

    // Find WPI in this section
    const wpiMatch = section.match(wpiRegex);
    if (wpiMatch) {
      const wpiValue = wpiMatch[0].match(/(\d+(?:\.\d+)?)/);
      wpi = parseFloat(wpiValue[1]);
    }

    // Find pain add-on in this section
    const painMatch = section.match(painRegex);
    if (painMatch) {
      const painValue = painMatch[0].match(/(\d+(?:\.\d+)?)/);
      painAddon = parseFloat(painValue[1]);
    }

    if (wpi !== null) {
      impairments.push({
        bodyPart,
        wpi,
        painAddon
      });
    }
  });

  return impairments;
}

/**
 * Extract work restrictions from report text
 */
function extractWorkRestrictions(text) {
  const restrictions = [];

  // Look for work restrictions section
  const restrictionsMatch = text.match(/work restrictions[:\s]+([^.]*(?:\.[^.]*)*)/i);
  if (restrictionsMatch) {
    const restrictionsText = restrictionsMatch[1];

    // Split into individual restrictions
    const individualRestrictions = restrictionsText.split(/[.,;]\s+/);
    restrictions.push(...individualRestrictions.map(r => r.trim()).filter(r => r));
  }

  return restrictions;
}

/**
 * Extract future medical needs from report text
 */
function extractFutureMedical(text) {
  const futureMedical = {
    needs: [],
    medications: []
  };

  // Look for future medical care section
  const medicalMatch = text.match(/future (?:medical care|treatment)[:\s]+([^.]*(?:\.[^.]*)*)/i);
  if (medicalMatch) {
    const medicalText = medicalMatch[1];
    const needs = medicalText.split(/[.,;]\s+/);
    futureMedical.needs.push(...needs.map(n => n.trim()).filter(n => n));
  }

  // Look for medications
  const medicationsMatch = text.match(/medications?[:\s]+([^.]*(?:\.[^.]*)*)/i);
  if (medicationsMatch) {
    const medicationsText = medicationsMatch[1];
    const medications = medicationsText.split(/[.,;]\s+/);
    futureMedical.medications.push(...medications.map(m => m.trim()).filter(m => m));
  }

  return futureMedical;
}

/**
 * Extract apportionment information from report text
 */
function extractApportionment(text) {
  const apportionment = [];

  // Look for apportionment section
  const apportionmentMatch = text.match(/apportionment[:\s]+([^.]*(?:\.[^.]*)*)/i);
  if (apportionmentMatch) {
    const apportionmentText = apportionmentMatch[1];
    const apportionments = apportionmentText.split(/[.,;]\s+/);
    apportionment.push(...apportionments.map(a => a.trim()).filter(a => a));
  }

  return apportionment;
}
