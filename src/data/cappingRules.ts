import { METRIC_IDS } from './biomarkerIds';

export interface CappingRule {
    mainMetricId: string; // Secondary Metric (the one being capped)
    relatedMetricIds: string[]; // Primary Metric (the condition)
    evaluate: (ranks: Record<string, number | null>) => { action: 'suppress' | 'cap' | 'none', capValue?: number };
    ruleTitle: string;
}

export const CAPPING_RULES: CappingRule[] = [
    // ========================================
    // 1. Apo B Capping (Primary: LDL, Secondary: Apo B)
    // ========================================
    {
        mainMetricId: METRIC_IDS.APO_B,
        relatedMetricIds: [METRIC_IDS.LDL],
        ruleTitle: 'Apo B Capping (LDL check)',
        evaluate: (ranks) => {
            const apoB = ranks[METRIC_IDS.APO_B];
            const ldl = ranks[METRIC_IDS.LDL];

            // Cap Apo B at 3 if Apo B <= 2 AND LDL >= 4
            if (
                apoB !== null && apoB <= 2 &&
                ldl !== null && ldl >= 4
            ) {
                return { action: 'cap', capValue: 3 };
            }

            return { action: 'none' };
        }
    },

    // ========================================
    // 2. Small LDL Capping (Primary: LDL, Secondary: Small LDL)
    // ========================================
    {
        mainMetricId: METRIC_IDS.SMALL_LDL,
        relatedMetricIds: [METRIC_IDS.LDL],
        ruleTitle: 'Small LDL Capping (LDL check)',
        evaluate: (ranks) => {
            const smallLDL = ranks[METRIC_IDS.SMALL_LDL];
            const ldl = ranks[METRIC_IDS.LDL];

            // Cap Small LDL at 3 if Small LDL <= 2 AND LDL >= 4
            if (
                smallLDL !== null && smallLDL <= 2 &&
                ldl !== null && ldl >= 4
            ) {
                return { action: 'cap', capValue: 3 };
            }

            return { action: 'none' };
        }
    },

    // ========================================
    // 3. Ferritin Suppression (Primary: hsCRP, Secondary: Ferritin)
    // ========================================
    {
        mainMetricId: METRIC_IDS.FERRITIN,
        relatedMetricIds: [METRIC_IDS.HS_CRP],
        ruleTitle: 'Ferritin Suppression (Inflammation check)',
        evaluate: (ranks) => {
            const ferritin = ranks[METRIC_IDS.FERRITIN];
            const hsCRP = ranks[METRIC_IDS.HS_CRP];

            // Ignore/Suppress Ferritin if hsCRP <= 3 AND Ferritin >= 4
            if (
                hsCRP !== null && hsCRP <= 3 &&
                ferritin !== null && ferritin >= 4
            ) {
                return { action: 'suppress' };
            }

            return { action: 'none' };
        }
    },

    // ========================================
    // 4. HDL Capping (Primary: hsCRP, Secondary: HDL)
    // ========================================
    {
        mainMetricId: METRIC_IDS.HDL,
        relatedMetricIds: [METRIC_IDS.HS_CRP],
        ruleTitle: 'HDL Capping (Inflammation check)',
        evaluate: (ranks) => {
            const hdl = ranks[METRIC_IDS.HDL];
            const hsCRP = ranks[METRIC_IDS.HS_CRP];

            // Cap HDL at 3 if hsCRP <= 3 AND HDL >= 4
            if (
                hsCRP !== null && hsCRP <= 3 &&
                hdl !== null && hdl >= 4
            ) {
                return { action: 'cap', capValue: 3 };
            }

            return { action: 'none' };
        }
    },

    // ========================================
    // 5. Free T3 Capping (Primary: TSH, Secondary: Free T3)
    // ========================================
    {
        mainMetricId: METRIC_IDS.FREE_T3,
        relatedMetricIds: [METRIC_IDS.TSH],
        ruleTitle: 'Free T3 Capping (TSH check)',
        evaluate: (ranks) => {
            const freeT3 = ranks[METRIC_IDS.FREE_T3];
            const tsh = ranks[METRIC_IDS.TSH];

            // Cap Free T3 at 3 if TSH <= 2 AND Free T3 >= 4
            if (
                tsh !== null && tsh <= 2 &&
                freeT3 !== null && freeT3 >= 4
            ) {
                return { action: 'cap', capValue: 3 };
            }

            return { action: 'none' };
        }
    },

    // ========================================
    // 6. Free T4 Capping (Primary: TSH, Secondary: Free T4)
    // ========================================
    {
        mainMetricId: METRIC_IDS.FREE_T4,
        relatedMetricIds: [METRIC_IDS.TSH],
        ruleTitle: 'Free T4 Capping (TSH check)',
        evaluate: (ranks) => {
            const freeT4 = ranks[METRIC_IDS.FREE_T4];
            const tsh = ranks[METRIC_IDS.TSH];

            // Cap Free T4 at 3 if TSH <= 2 AND Free T4 >= 4
            if (
                tsh !== null && tsh <= 2 &&
                freeT4 !== null && freeT4 >= 4
            ) {
                return { action: 'cap', capValue: 3 };
            }

            return { action: 'none' };
        }
    },

    // ========================================
    // 7. Triglycerides Capping (Primary: Fasting Insulin, Secondary: TG)
    // ========================================
    {
        mainMetricId: METRIC_IDS.TRIGLYCERIDES,
        relatedMetricIds: [METRIC_IDS.FASTING_INSULIN],
        ruleTitle: 'TG Capping (Insulin check)',
        evaluate: (ranks) => {
            const tg = ranks[METRIC_IDS.TRIGLYCERIDES];
            const fastingInsulin = ranks[METRIC_IDS.FASTING_INSULIN];

            // Cap TG at 3 if Fasting Insulin <= 2 AND TG >= 4
            if (
                fastingInsulin !== null && fastingInsulin <= 2 &&
                tg !== null && tg >= 4
            ) {
                return { action: 'cap', capValue: 3 };
            }

            return { action: 'none' };
        }
    },

    // ========================================
    // 8. HDL Capping (Primary: Triglycerides, Secondary: HDL)
    // ========================================
    {
        mainMetricId: METRIC_IDS.HDL,
        relatedMetricIds: [METRIC_IDS.TRIGLYCERIDES],
        ruleTitle: 'HDL Capping (TG check)',
        evaluate: (ranks) => {
            const hdl = ranks[METRIC_IDS.HDL];
            const tg = ranks[METRIC_IDS.TRIGLYCERIDES];

            // Cap HDL at 3 if TG <= 2 AND HDL >= 4
            if (
                tg !== null && tg <= 2 &&
                hdl !== null && hdl >= 4
            ) {
                return { action: 'cap', capValue: 3 };
            }

            return { action: 'none' };
        }
    },

    // ========================================
    // 9. Homocysteine Capping (Primary: hsCRP, Secondary: Homocysteine)
    // ========================================
    {
        mainMetricId: METRIC_IDS.HOMOCYSTEINE,
        relatedMetricIds: [METRIC_IDS.HS_CRP],
        ruleTitle: 'Homocysteine Capping (Inflammation check)',
        evaluate: (ranks) => {
            const homocysteine = ranks[METRIC_IDS.HOMOCYSTEINE];
            const hsCRP = ranks[METRIC_IDS.HS_CRP];

            // Cap Homocysteine at 3 if hsCRP <= 2 AND Homocysteine >= 4
            if (
                hsCRP !== null && hsCRP <= 2 &&
                homocysteine !== null && homocysteine >= 4
            ) {
                return { action: 'cap', capValue: 3 };
            }

            return { action: 'none' };
        }
    }
];
