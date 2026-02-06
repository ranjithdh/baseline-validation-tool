
export interface ContextRule {
    mainBiomarkerName: string;
    relatedBiomarkerNames: string[];
    evaluate: (ranks: Record<string, number | null>) => { action: 'suppress' | 'cap' | 'none', capValue?: number };
    ruleTitle: string;
}

/**
 * CONTEXT RULES
 * 
 * IMPORTANT: All rank comparisons (e.g., "Iron <= 2", "Ferritin >= 4") refer to the 
 * ORIGINAL RATING RANK from the biomarker data, NOT hardcoded threshold values.
 * 
 * The `ranks` parameter contains the original rating ranks for each biomarker name (API display name)
 * or metric ID, where ranks typically range from 1 (optimal) to 5 (poor).
 */
export const CONTEXT_RULES: ContextRule[] = [
    // ========================================
    // 1. FERRITIN SUPPRESSION RULES (3 conditions)
    // ========================================
    {
        mainBiomarkerName: 'Ferritin',
        relatedBiomarkerNames: ['Iron', 'High Sensitivity C-Reactive Protein (hs-CRP)', 'IL-6'],
        ruleTitle: 'Ferritin Suppression (Iron/Inflammation check)',
        evaluate: (ranks) => {
            const ferritin = ranks['Ferritin'];
            const iron = ranks['Iron'];
            const hsCRP = ranks['High Sensitivity C-Reactive Protein (hs-CRP)'];
            const il6 = ranks['IL-6'];

            // Rule 1: Iron <= 2 AND Ferritin >= 4 AND (hsCRP <= 2 OR IL-6 <= 2)
            if (
                iron !== null && iron <= 2 &&
                ferritin !== null && ferritin >= 4 &&
                ((hsCRP !== null && hsCRP <= 2) || (il6 !== null && il6 <= 2))
            ) {
                return { action: 'suppress' };
            }

            // Rule 2: Iron <= 2 AND Ferritin >= 4 AND hsCRP >= 4 AND IL-6 >= 4
            if (
                iron !== null && iron <= 2 &&
                ferritin !== null && ferritin >= 4 &&
                hsCRP !== null && hsCRP >= 4 &&
                il6 !== null && il6 >= 4
            ) {
                return { action: 'suppress' };
            }

            return { action: 'none' };
        }
    },

    // ========================================
    // 2. HbA1c CAPPING
    // ========================================
    {
        mainBiomarkerName: 'Haemoglobin A1C (HbA1C)',
        relatedBiomarkerNames: ['Fasting Insulin', 'Postprandial (PP) Insulin'],
        ruleTitle: 'HbA1c Capping (Insulin context)',
        evaluate: (ranks) => {
            const hba1c = ranks['Haemoglobin A1C (HbA1C)'];
            const fastingInsulin = ranks['Fasting Insulin'];
            const ppInsulin = ranks['Postprandial (PP) Insulin'];

            // HbA1c >= 4 AND (Fasting Insulin <= 2 OR PP Insulin <= 2) → Cap at 3
            if (
                hba1c !== null && hba1c >= 4 &&
                ((fastingInsulin !== null && fastingInsulin <= 2) ||
                    (ppInsulin !== null && ppInsulin <= 2))
            ) {
                return { action: 'cap', capValue: 3 };
            }

            return { action: 'none' };
        }
    },

    // ========================================
    // 3. HDL CAPPING (3 variations)
    // ========================================
    {
        mainBiomarkerName: 'HDL Cholesterol',
        relatedBiomarkerNames: ['Triglycerides (TGL)', 'Fasting Insulin', 'Postprandial (PP) Insulin', 'High Sensitivity C-Reactive Protein (hs-CRP)'],
        ruleTitle: 'HDL Capping (Metabolic context)',
        evaluate: (ranks) => {
            const hdl = ranks['HDL Cholesterol'];
            const tg = ranks['Triglycerides (TGL)'];
            const fastingInsulin = ranks['Fasting Insulin'];
            const ppInsulin = ranks['Postprandial (PP) Insulin'];
            const hsCRP = ranks['High Sensitivity C-Reactive Protein (hs-CRP)'];

            if (hdl === null || hdl < 4) {
                return { action: 'none' };
            }

            // Rule A: HDL >= 4 AND (Triglycerides <= 2 OR Fasting/PP Insulin <= 2)
            if (
                (tg !== null && tg <= 2) ||
                (fastingInsulin !== null && fastingInsulin <= 2) ||
                (ppInsulin !== null && ppInsulin <= 2)
            ) {
                return { action: 'cap', capValue: 3 };
            }

            // Rule C: hsCRP <= 3 AND HDL >= 4
            if (hsCRP !== null && hsCRP <= 3) {
                return { action: 'cap', capValue: 3 };
            }

            return { action: 'none' };
        }
    },

    // ========================================
    // 4. FREE T3 CAPPING
    // ========================================
    {
        mainBiomarkerName: 'Free T3',
        relatedBiomarkerNames: ['Thyroid Stimulating Hormone (TSH)', 'Free T4'],
        ruleTitle: 'Free T3 Capping (Thyroid context)',
        evaluate: (ranks) => {
            const freeT3 = ranks['Free T3'];
            const tsh = ranks['Thyroid Stimulating Hormone (TSH)'];
            const freeT4 = ranks['Free T4'];

            // Rule 1: TSH >= 4 AND Free T4 <= 2 → Cap Free T3 at 3
            if (
                freeT3 !== null && freeT3 >= 4 &&
                tsh !== null && tsh >= 4 &&
                freeT4 !== null && freeT4 <= 2
            ) {
                return { action: 'cap', capValue: 3 };
            }

            // Rule 2: TSH <= 2 AND Free T3 >= 4 → Cap Free T3 at 3
            if (
                freeT3 !== null && freeT3 >= 4 &&
                tsh !== null && tsh <= 2
            ) {
                return { action: 'cap', capValue: 3 };
            }

            return { action: 'none' };
        }
    },

    // ========================================
    // 5. NON-HDL CHOLESTEROL RULES
    // ========================================
    {
        mainBiomarkerName: 'Non-HDL Cholesterol',
        relatedBiomarkerNames: ['LDL Cholesterol', 'Small LDL', 'Apolipoprotein B (APO-B)'],
        ruleTitle: 'Non-HDL Cholesterol Capping (LDL/ApoB context)',
        evaluate: (ranks) => {
            const nonHDL = ranks['Non-HDL Cholesterol'];
            const ldl = ranks['LDL Cholesterol'];
            const smallLDL = ranks['Small LDL'];
            const apoB = ranks['Apolipoprotein B (APO-B)'];

            // Capping: LDL >= 4 AND (Non-HDL <= 2 OR Small LDL <= 2) → Cap at 3
            if (
                nonHDL !== null && nonHDL <= 2 &&
                ldl !== null && ldl >= 4
            ) {
                return { action: 'cap', capValue: 3 };
            }

            if (
                smallLDL !== null && smallLDL <= 2 &&
                ldl !== null && ldl >= 4
            ) {
                return { action: 'cap', capValue: 3 };
            }

            // Enhancement: LDL <= 2 AND (Small LDL > 3 OR Apo B > 3) → Lower bottom at 3
            if (
                ldl !== null && ldl <= 2 &&
                nonHDL !== null && nonHDL < 3 &&
                ((smallLDL !== null && smallLDL > 3) || (apoB !== null && apoB > 3))
            ) {
                return { action: 'cap', capValue: 3 };
            }

            return { action: 'none' };
        }
    },

    // ========================================
    // 6. CORTISOL CAPPING
    // ========================================
    {
        mainBiomarkerName: 'Cortisol',
        relatedBiomarkerNames: ['PHQ-2', 'GAD-2'],
        ruleTitle: 'Cortisol Capping (Mood context)',
        evaluate: (ranks) => {
            const cortisol = ranks['Cortisol'];
            const phq2 = ranks['PHQ-2'];
            const gad2 = ranks['GAD-2'];

            // Cortisol >= 4 AND (PHQ-2 <= 3 OR GAD-2 <= 3) → Cap at 3
            if (
                cortisol !== null && cortisol >= 4 &&
                ((phq2 !== null && phq2 <= 3) || (gad2 !== null && gad2 <= 3))
            ) {
                return { action: 'cap', capValue: 3 };
            }

            return { action: 'none' };
        }
    },

    // ========================================
    // 7. FREE TESTOSTERONE CONDITIONAL CAPPING
    // ========================================
    {
        mainBiomarkerName: 'Free Testosterone',
        relatedBiomarkerNames: ['Total Testosterone', 'Sex Hormone Binding Globulin (SHBG)'],
        ruleTitle: 'Free Testosterone Capping (Total T/SHBG context)',
        evaluate: (ranks) => {
            const freeT = ranks['Free Testosterone'];
            const totalT = ranks['Total Testosterone'];
            const shbg = ranks['Sex Hormone Binding Globulin (SHBG)'];

            if (freeT === null || freeT < 4) {
                return { action: 'none' };
            }

            // IF Total T <= 2, THEN cap Free T at 3
            if (totalT !== null && totalT <= 2) {
                return { action: 'cap', capValue: 3 };
            }

            // ELSE IF SHBG <= 2, THEN cap Free T at 3
            if (shbg !== null && shbg <= 2) {
                return { action: 'cap', capValue: 3 };
            }

            return { action: 'none' };
        }
    },

    // ========================================
    // 8. NLR SUPPRESSION
    // ========================================
    {
        mainBiomarkerName: 'NLR',
        relatedBiomarkerNames: ['IL-6'],
        ruleTitle: 'NLR Suppression (IL-6 context)',
        evaluate: (ranks) => {
            const nlr = ranks['NLR'];
            const il6 = ranks['IL-6'];

            // NLR < 3 AND IL-6 <= 2 → Suppress
            if (
                nlr !== null && nlr < 3 &&
                il6 !== null && il6 <= 2
            ) {
                return { action: 'suppress' };
            }

            return { action: 'none' };
        }
    },

    // ========================================
    // 9. GGT CAPPING
    // ========================================
    {
        mainBiomarkerName: 'Gamma-Glutamyl Transferase (GGT)',
        relatedBiomarkerNames: ['Aspartate Aminotransferase (SGOT)', 'Alanine Transaminase (SGPT)'],
        ruleTitle: 'GGT Capping (Liver context)',
        evaluate: (ranks) => {
            const ggt = ranks['Gamma-Glutamyl Transferase (GGT)'];
            const sgot = ranks['Aspartate Aminotransferase (SGOT)'];
            const sgpt = ranks['Alanine Transaminase (SGPT)'];

            // GGT >= 3 AND (SGOT <= 2 OR SGPT <= 2) → Cap at 3
            if (
                ggt !== null && ggt >= 3 &&
                ((sgot !== null && sgot <= 2) || (sgpt !== null && sgpt <= 2))
            ) {
                return { action: 'cap', capValue: 3 };
            }

            return { action: 'none' };
        }
    }
];

/**
 * Interface for internal metric ID based rules used by calculation engine
 */
export interface MetricIdRule {
    mainMetricId: string;
    relatedMetricIds: string[];
    evaluate: (ranks: Record<string, number | null>) => { action: 'suppress' | 'cap' | 'none', capValue?: number };
}

/**
 * Convert context rules to use metric IDs or directly use names if mapped in ranks
 * This function is used by applyContextRules in scoreCalculator.ts
 */
export function getContextRulesWithNames(): ContextRule[] {
    return CONTEXT_RULES;
}
