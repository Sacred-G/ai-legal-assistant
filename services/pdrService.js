import sqlite3 from 'sqlite3';
import { promisify } from 'util';

class PDRService {
    constructor() {
        this.db = new sqlite3.Database('./data/local.db');
        this.dbAll = promisify(this.db.all).bind(this.db);
        this.dbGet = promisify(this.db.get).bind(this.db);
        this.dbRun = promisify(this.db.run).bind(this.db);
    }

    async getAgeAdjustmentFactor(age, wpiPercent) {
        let ageRange;
        if (age <= 21) ageRange = 'age_21_and_under';
        else if (age <= 26) ageRange = 'age_22_to_26';
        else if (age <= 31) ageRange = 'age_27_to_31';
        else if (age <= 36) ageRange = 'age_32_to_36';
        else if (age <= 41) ageRange = 'age_37_to_41';
        else if (age <= 46) ageRange = 'age_42_to_46';
        else if (age <= 51) ageRange = 'age_47_to_51';
        else if (age <= 56) ageRange = 'age_52_to_56';
        else if (age <= 61) ageRange = 'age_57_to_61';
        else ageRange = 'age_62_and_over';

        const result = await this.dbGet(
            `SELECT ${ageRange} as factor FROM age_adjustments WHERE wpi_percent = ?`,
            [Math.round(wpiPercent)]
        );
        return result ? result.factor : null;
    }

    async getOccupationalAdjustment(occupation, wpiPercent) {
        // Get occupation group
        const occupationResult = await this.dbGet(
            'SELECT group_number FROM occupations WHERE occupation_title LIKE ?',
            [`%${occupation}%`]
        );

        if (!occupationResult) {
            throw new Error(`Occupation not found: ${occupation}`);
        }

        // Get occupational adjustment
        const groupNumber = occupationResult.group_number;
        const result = await this.dbGet(
            `SELECT variant FROM variants WHERE body_part = ? AND occupational_group = ? AND impairment_code = ?`,
            ['General', groupNumber, 'DEFAULT']
        );

        return result ? parseFloat(result.variant) : null;
    }

    async getImpairmentDetails(code) {
        const result = await this.dbGet(
            'SELECT * FROM bodypart_impairments WHERE code = ?',
            [code]
        );
        return result;
    }

    async calculateRating(medicalData) {
        try {
            const noApportionmentSections = [];
            const withApportionmentSections = [];
            let totalNoApport = 0;
            let totalWithApport = 0;

            // Get statutory max weekly earnings
            const maxWeeklyEarnings = 435.00; // Default PD Statutory Max
            const actualWeeklyEarnings = Math.min(medicalData.demographics.weeklyEarnings || maxWeeklyEarnings, maxWeeklyEarnings);
            const pdWeeklyRate = Math.min(actualWeeklyEarnings * (2 / 3), 290.00); // 2/3 of earnings, capped at 290

            // Calculate age at time of injury
            const dob = new Date(medicalData.demographics.dateOfBirth);
            const doi = new Date(medicalData.demographics.dateOfInjury);
            const age = Math.floor((doi - dob) / (365.25 * 24 * 60 * 60 * 1000));

            // Process each impairment
            for (const impairment of medicalData.impairments) {
                // Get occupational adjustment using exact title
                const occupationalAdjustment = await this.getOccupationalAdjustment(
                    medicalData.demographics.occupation.title,
                    impairment.wpi
                );
                if (!occupationalAdjustment) {
                    throw new Error(`Occupational adjustment not found for occupation: ${medicalData.demographics.occupation.title}`);
                }

                // Start with base WPI and multiply by 1.4
                let finalRating = impairment.wpi * 1.4;

                // Apply occupational adjustment based on work category
                const occupationGroup = occupationalAdjustment;
                if (occupationGroup === 'C') { // Light Work
                    if (finalRating <= 0.05) finalRating = 0.03;
                    else if (finalRating <= 0.10) finalRating = 0.07;
                    else if (finalRating <= 0.15) finalRating = 0.11;
                    else if (finalRating <= 0.20) finalRating = 0.15;
                    else if (finalRating <= 0.25) finalRating = 0.18;
                    else if (finalRating <= 0.30) finalRating = 0.23;
                    else if (finalRating <= 0.35) finalRating = 0.27;
                    else if (finalRating <= 0.40) finalRating = 0.32;
                    else if (finalRating <= 0.45) finalRating = 0.36;
                    else if (finalRating <= 0.50) finalRating = 0.41;
                } else if (occupationGroup === 'J') { // Heavy Work
                    if (finalRating <= 0.05) finalRating = 0.09;
                    else if (finalRating <= 0.10) finalRating = 0.16;
                    else if (finalRating <= 0.15) finalRating = 0.23;
                    else if (finalRating <= 0.20) finalRating = 0.29;
                    else if (finalRating <= 0.25) finalRating = 0.36;
                    else if (finalRating <= 0.30) finalRating = 0.41;
                    else if (finalRating <= 0.35) finalRating = 0.47;
                    else if (finalRating <= 0.40) finalRating = 0.52;
                    else if (finalRating <= 0.45) finalRating = 0.58;
                    else if (finalRating <= 0.50) finalRating = 0.62;
                }
                // For Medium Work (Category F), rating stays the same

                // Calculate age adjustment factor
                let ageAdjustmentFactor = 0;
                if (age < 30) ageAdjustmentFactor = -0.1;
                else if (age >= 35 && age <= 39) ageAdjustmentFactor = 0.1;
                else if (age >= 40 && age <= 44) ageAdjustmentFactor = 0.2;
                else if (age >= 45 && age <= 49) ageAdjustmentFactor = 0.3;
                else if (age >= 50 && age <= 54) ageAdjustmentFactor = 0.4;
                else if (age >= 55 && age <= 59) ageAdjustmentFactor = 0.5;
                else if (age >= 60) ageAdjustmentFactor = 0.6;

                // Add age adjustment to rating
                finalRating += ageAdjustmentFactor;

                // Cap at maximum adjustment of 0.62 (62%)
                finalRating = Math.min(finalRating, 0.62);

                // Apply pain add-on if specified (3% standard)
                if (impairment.adjustments.pain.add) {
                    finalRating += 0.03;
                }

                // Get impairment details from database
                const impairmentDetails = await this.getImpairmentDetails(impairment.bodyPart.code);

                // Create section with detailed information
                const section = {
                    code: impairment.bodyPart.code,
                    name: impairment.bodyPart.name,
                    section: impairment.bodyPart.section,
                    type: impairment.bodyPart.type,
                    description: impairmentDetails ? impairmentDetails.description : impairment.bodyPart.name,
                    wpi: impairment.wpi,
                    occupationalAdjustment: occupationalAdjustment,
                    ageAdjustment: ageAdjustmentFactor,
                    painAdd: impairment.adjustments.pain.add,
                    adlImpact: impairment.adjustments.adl.impacted,
                    rating: parseFloat(finalRating.toFixed(2)),
                    futureMedial: impairment.futureMedial,
                    apportionment: impairment.apportionment
                };

                // Add to appropriate section based on apportionment
                if (impairment.apportionment.nonIndustrial > 0) {
                    withApportionmentSections.push(section);
                    const industrialRating = finalRating * (impairment.apportionment.industrial / 100);
                    totalWithApport = this.combineRatings([totalWithApport, industrialRating]);
                } else {
                    noApportionmentSections.push(section);
                    totalNoApport = this.combineRatings([totalNoApport, finalRating]);
                }
            }

            // Calculate total PD payout (using higher of the two ratings)
            const higherRating = Math.max(totalNoApport, totalWithApport);
            const pdPayout = higherRating * 620; // Standard multiplier

            return {
                no_apportionment: {
                    sections: noApportionmentSections,
                    total: parseFloat(totalNoApport.toFixed(2))
                },
                with_apportionment: {
                    sections: withApportionmentSections,
                    total: parseFloat(totalWithApport.toFixed(2))
                },
                weekly_earnings: actualWeeklyEarnings,
                pd_weekly_rate: pdWeeklyRate,
                total_pd_payout: parseFloat(pdPayout.toFixed(2)),
                life_weekly_rate: Math.min(actualWeeklyEarnings * 0.195, 85.00) // 19.5% of earnings, capped at 85
            };
        } catch (error) {
            console.error('Error calculating PDR:', error);
            throw error;
        }
    }

    // Helper function to combine multiple ratings using the Combined Values Chart formula
    combineRatings(ratings) {
        if (ratings.length === 0) return 0;

        // Sort ratings in descending order
        ratings.sort((a, b) => b - a);

        // Start with the highest rating
        let result = ratings[0];

        // Combine subsequent ratings
        for (let i = 1; i < ratings.length; i++) {
            result = result + (ratings[i] * (1 - result / 100));
        }

        return parseFloat(result.toFixed(2));
    }
}

export default new PDRService();
