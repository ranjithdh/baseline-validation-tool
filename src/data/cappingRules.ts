
export interface CappingRule {
    mainBiomarkerName: string; // Secondary Metric (the one being capped)
    relatedBiomarkerNames: string[]; // Primary Metric (the condition)
    evaluate: (ranks: Record<string, number | null>) => { action: 'suppress' | 'cap' | 'none', capValue?: number };
    ruleTitle: string;
}

export const CAPPING_RULES: CappingRule[] = [
    // ========================================
    // 1. Apo B Capping (Primary: LDL, Secondary: Apo B)
    // ========================================
    {
        mainBiomarkerName: 'Apolipoprotein B (APO-B)',
        relatedBiomarkerNames: ['LDL Cholesterol'],
        ruleTitle: 'Apo B Capping (LDL check)',
        evaluate: (ranks) => {
            const apoB = ranks['Apolipoprotein B (APO-B)'];
            const ldl = ranks['LDL Cholesterol'];

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
        mainBiomarkerName: 'Small LDL',
        relatedBiomarkerNames: ['LDL Cholesterol'],
        ruleTitle: 'Small LDL Capping (LDL check)',
        evaluate: (ranks) => {
            const smallLDL = ranks['Small LDL'];
            const ldl = ranks['LDL Cholesterol'];

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
        mainBiomarkerName: 'Ferritin',
        relatedBiomarkerNames: ['High Sensitivity C-Reactive Protein (hs-CRP)'],
        ruleTitle: 'Ferritin Suppression (Inflammation check)',
        evaluate: (ranks) => {
            const ferritin = ranks['Ferritin'];
            const hsCRP = ranks['High Sensitivity C-Reactive Protein (hs-CRP)'];

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
        mainBiomarkerName: 'HDL Cholesterol',
        relatedBiomarkerNames: ['High Sensitivity C-Reactive Protein (hs-CRP)'],
        ruleTitle: 'HDL Capping (Inflammation check)',
        evaluate: (ranks) => {
            const hdl = ranks['HDL Cholesterol'];
            const hsCRP = ranks['High Sensitivity C-Reactive Protein (hs-CRP)'];

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
        mainBiomarkerName: 'Free T3',
        relatedBiomarkerNames: ['Thyroid Stimulating Hormone (TSH)'],
        ruleTitle: 'Free T3 Capping (TSH check)',
        evaluate: (ranks) => {
            const freeT3 = ranks['Free T3'];
            const tsh = ranks['Thyroid Stimulating Hormone (TSH)'];

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
        mainBiomarkerName: 'Free T4',
        relatedBiomarkerNames: ['Thyroid Stimulating Hormone (TSH)'],
        ruleTitle: 'Free T4 Capping (TSH check)',
        evaluate: (ranks) => {
            const freeT4 = ranks['Free T4'];
            const tsh = ranks['Thyroid Stimulating Hormone (TSH)'];

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
        mainBiomarkerName: 'Triglycerides (TGL)',
        relatedBiomarkerNames: ['Fasting Insulin'],
        ruleTitle: 'TG Capping (Insulin check)',
        evaluate: (ranks) => {
            const tg = ranks['Triglycerides (TGL)'];
            const fastingInsulin = ranks['Fasting Insulin'];

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
        mainBiomarkerName: 'HDL Cholesterol',
        relatedBiomarkerNames: ['Triglycerides (TGL)'],
        ruleTitle: 'HDL Capping (TG check)',
        evaluate: (ranks) => {
            const hdl = ranks['HDL Cholesterol'];
            const tg = ranks['Triglycerides (TGL)'];

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
        mainBiomarkerName: 'Homocysteine',
        relatedBiomarkerNames: ['High Sensitivity C-Reactive Protein (hs-CRP)'],
        ruleTitle: 'Homocysteine Capping (Inflammation check)',
        evaluate: (ranks) => {
            const homocysteine = ranks['Homocysteine'];
            const hsCRP = ranks['High Sensitivity C-Reactive Protein (hs-CRP)'];

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
