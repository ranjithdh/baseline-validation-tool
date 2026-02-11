import { METRIC_IDS } from './biomarkerIds';

export interface ContextRule {
    mainMetricId: string;
    relatedMetricIds: string[];
    evaluate: (ranks: Record<string, number | null>) => { action: 'suppress' | 'cap' | 'none', capValue?: number };
    ruleTitle: string;
}

/**
 * CONTEXT RULES
 * 
 * IMPORTANT: All rank comparisons (e.g., "Iron <= 2", "Ferritin >= 4") refer to the 
 * ORIGINAL RATING RANK from the biomarker data, NOT hardcoded threshold values.
 * 
 * The `ranks` parameter contains the original rating ranks KEYED BY METRIC ID.
 * ranks typically range from 1 (optimal) to 5 (poor).
 */
export const CONTEXT_RULES: ContextRule[] = [
    // ========================================
    // 1. FERRITIN SUPPRESSION RULES (3 conditions)
    // ========================================
    {
        mainMetricId: METRIC_IDS.FERRITIN,
        relatedMetricIds: [METRIC_IDS.IRON, METRIC_IDS.HS_CRP, METRIC_IDS.IL_6],
        ruleTitle: 'Ferritin Suppression (Iron/Inflammation check)',
        evaluate: (ranks) => {
            const ferritin = ranks[METRIC_IDS.FERRITIN];
            const iron = ranks[METRIC_IDS.IRON];
            const hsCRP = ranks[METRIC_IDS.HS_CRP];
            const il6 = ranks[METRIC_IDS.IL_6];

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
        mainMetricId: METRIC_IDS.HBA1C,
        relatedMetricIds: [METRIC_IDS.FASTING_INSULIN, METRIC_IDS.PP_INSULIN],
        ruleTitle: 'HbA1c Capping (Insulin context)',
        evaluate: (ranks) => {
            const hba1c = ranks[METRIC_IDS.HBA1C];
            const fastingInsulin = ranks[METRIC_IDS.FASTING_INSULIN];
            const ppInsulin = ranks[METRIC_IDS.PP_INSULIN];

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
        mainMetricId: METRIC_IDS.HDL,
        relatedMetricIds: [METRIC_IDS.TRIGLYCERIDES, METRIC_IDS.FASTING_INSULIN, METRIC_IDS.PP_INSULIN, METRIC_IDS.HS_CRP],
        ruleTitle: 'HDL Capping (Metabolic context)',
        evaluate: (ranks) => {
            const hdl = ranks[METRIC_IDS.HDL];
            const tg = ranks[METRIC_IDS.TRIGLYCERIDES];
            const fastingInsulin = ranks[METRIC_IDS.FASTING_INSULIN];
            const ppInsulin = ranks[METRIC_IDS.PP_INSULIN];
            const hsCRP = ranks[METRIC_IDS.HS_CRP];

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
        mainMetricId: METRIC_IDS.FREE_T3,
        relatedMetricIds: [METRIC_IDS.TSH, METRIC_IDS.FREE_T4],
        ruleTitle: 'Free T3 Capping (Thyroid context)',
        evaluate: (ranks) => {
            const freeT3 = ranks[METRIC_IDS.FREE_T3];
            const tsh = ranks[METRIC_IDS.TSH];
            const freeT4 = ranks[METRIC_IDS.FREE_T4];

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
        mainMetricId: METRIC_IDS.NON_HDL,
        relatedMetricIds: [METRIC_IDS.LDL, METRIC_IDS.SMALL_LDL, METRIC_IDS.APO_B],
        ruleTitle: 'Non-HDL Cholesterol Capping (LDL/ApoB context)',
        evaluate: (ranks) => {
            const nonHDL = ranks[METRIC_IDS.NON_HDL];
            const ldl = ranks[METRIC_IDS.LDL];
            const smallLDL = ranks[METRIC_IDS.SMALL_LDL];
            const apoB = ranks[METRIC_IDS.APO_B];

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
        mainMetricId: METRIC_IDS.CORTISOL,
        relatedMetricIds: [METRIC_IDS.PHQ_2, METRIC_IDS.GAD_2],
        ruleTitle: 'Cortisol Capping (Mood context)',
        evaluate: (ranks) => {
            const cortisol = ranks[METRIC_IDS.CORTISOL];
            const phq2 = ranks[METRIC_IDS.PHQ_2];
            const gad2 = ranks[METRIC_IDS.GAD_2];

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
        mainMetricId: METRIC_IDS.FREE_TESTOSTERONE,
        relatedMetricIds: [METRIC_IDS.TOTAL_TESTOSTERONE, METRIC_IDS.SHBG],
        ruleTitle: 'Free Testosterone Capping (Total T/SHBG context)',
        evaluate: (ranks) => {
            const freeT = ranks[METRIC_IDS.FREE_TESTOSTERONE];
            const totalT = ranks[METRIC_IDS.TOTAL_TESTOSTERONE];
            const shbg = ranks[METRIC_IDS.SHBG];

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
        mainMetricId: METRIC_IDS.NLR,
        relatedMetricIds: [METRIC_IDS.IL_6],
        ruleTitle: 'NLR Suppression (IL-6 context)',
        evaluate: (ranks) => {
            const nlr = ranks[METRIC_IDS.NLR];
            const il6 = ranks[METRIC_IDS.IL_6];

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
        mainMetricId: METRIC_IDS.GGT,
        relatedMetricIds: [METRIC_IDS.SGOT, METRIC_IDS.SGPT],
        ruleTitle: 'GGT Capping (Liver context)',
        evaluate: (ranks) => {
            const ggt = ranks[METRIC_IDS.GGT];
            const sgot = ranks[METRIC_IDS.SGOT];
            const sgpt = ranks[METRIC_IDS.SGPT];

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

export function getContextRulesWithNames(): ContextRule[] {
    return CONTEXT_RULES;
}
