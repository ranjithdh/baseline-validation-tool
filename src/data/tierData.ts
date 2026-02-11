import { METRIC_IDS } from './biomarkerIds';

export interface TieredBiomarker {
    name: string;
    metric_id?: string;
    tier: 'A' | 'B' | 'C';
    targetScore: number;
    relatedNames?: string[];
    relatedMetricIds?: string[];
    rule?: 'substitute' | 'lowest';
}

export const TIER_DATA: TieredBiomarker[] = [
    // Tier A (600 points total)
    { name: "Haemoglobin A1C (HbA1C)", metric_id: METRIC_IDS.HBA1C, tier: "A", targetScore: 60 },
    {
        name: "Insulin",
        tier: "A",
        targetScore: 60,
        relatedNames: ["Fasting Insulin", "Postprandial (PP) Insulin"],
        relatedMetricIds: [METRIC_IDS.FASTING_INSULIN, METRIC_IDS.PP_INSULIN],
        rule: 'lowest'
    },
    {
        name: "Non-HDL Cholesterol",
        metric_id: METRIC_IDS.NON_HDL,
        tier: "A",
        targetScore: 60
    },
    {
        name: "Body Fat %",
        metric_id: METRIC_IDS.BODY_FAT,
        tier: "A",
        targetScore: 60,
        relatedNames: ["Body Mass Index (BMI)"],
        relatedMetricIds: [METRIC_IDS.BMI],
        rule: 'substitute'
    },
    {
        name: "VO2 Max",
        metric_id: METRIC_IDS.VO2_MAX,
        tier: "A",
        targetScore: 60
    },

    {
        name: "High Sensitivity C-Reactive Protein (hs-CRP)",
        metric_id: METRIC_IDS.HS_CRP,
        tier: "A",
        targetScore: 50
    },
    {
        name: "Gamma-Glutamyl Transferase (GGT)",
        metric_id: METRIC_IDS.GGT,
        tier: "A",
        targetScore: 50
    },
    { name: "Thyroid Stimulating Hormone (TSH)", metric_id: METRIC_IDS.TSH, tier: "A", targetScore: 30 },
    { name: "PHQ-2", metric_id: METRIC_IDS.PHQ_2, tier: "A", targetScore: 30 },
    { name: "GAD-2", metric_id: METRIC_IDS.GAD_2, tier: "A", targetScore: 30 },
    { name: "Vitamin D", metric_id: METRIC_IDS.VITAMIN_D, tier: "A", targetScore: 40 },
    { name: "Vitamin B12 (Cobalamin)", metric_id: METRIC_IDS.VITAMIN_B12, tier: "A", targetScore: 40 },
    { name: "Ferritin", metric_id: METRIC_IDS.FERRITIN, tier: "A", targetScore: 30 },

    // Tier B (240 points total)
    { name: "Cortisol", metric_id: METRIC_IDS.CORTISOL, tier: "B", targetScore: 20 },
    { name: "Free Triiodothyronine (FT3)", metric_id: METRIC_IDS.FREE_T3, tier: "B", targetScore: 25 },
    {
        name: "Free Testosterone",
        metric_id: METRIC_IDS.FREE_TESTOSTERONE,
        tier: "B",
        targetScore: 20,
        relatedNames: ["Total Testosterone"],
        relatedMetricIds: [METRIC_IDS.TOTAL_TESTOSTERONE],
        rule: 'substitute'
    },
    { name: "HDL Cholesterol", metric_id: METRIC_IDS.HDL, tier: "B", targetScore: 30 },
    { name: "Homocysteine", metric_id: METRIC_IDS.HOMOCYSTEINE, tier: "B", targetScore: 30 },
    { name: "Lipoprotein A [LP(A)]", metric_id: METRIC_IDS.LPA, tier: "B", targetScore: 15 },
    { name: "Triglycerides (TGL)", metric_id: METRIC_IDS.TRIGLYCERIDES, tier: "B", targetScore: 30 },
    { name: "Uric Acid", metric_id: METRIC_IDS.URIC_ACID, tier: "B", targetScore: 20 },
    { name: "Small Dense Low-Density Lipoprotein Cholesterol (sdLDL-C)", metric_id: METRIC_IDS.SMALL_LDL, tier: "B", targetScore: 30 },


    { name: "Free thyroxine (FT4)", metric_id: METRIC_IDS.FREE_T4, tier: "B", targetScore: 0 },
    {
        name: "Blood Pressure",
        tier: "B",
        targetScore: 20,
        relatedNames: ["Systolic Blood Pressure", "Diastolic Blood Pressure"],
        relatedMetricIds: [METRIC_IDS.SYSTOLIC_BP, METRIC_IDS.DIASTOLIC_BP],
        rule: 'lowest'
    },


    // Tier C (160 points total)
    { name: "Serum Albumin", metric_id: METRIC_IDS.ALBUMIN, tier: "C", targetScore: 10 },
    {
        name: "Total RBC",
        metric_id: METRIC_IDS.RBC,
        tier: "C",
        targetScore: 10,
        relatedNames: ["Haemoglobin"],
        relatedMetricIds: [METRIC_IDS.HAEMOGLOBIN],
        rule: 'lowest'
    },
    {
        name: "Total WBC",
        metric_id: METRIC_IDS.WBC,
        tier: "C",
        targetScore: 10,
        relatedMetricIds: [METRIC_IDS.NEUTROPHILS,METRIC_IDS.LYMPHOCYTES],
        rule: 'lowest'
    },
    { name: "Folate", metric_id: METRIC_IDS.FOLATE, tier: "C", targetScore: 10 },
    { name: "Iron", metric_id: METRIC_IDS.IRON, tier: "C", targetScore: 10 },
    { name: "Red Cell Distribution Width – Coefficient Of Variation (RDW-CV)", metric_id: METRIC_IDS.RDW_CV, tier: "C", targetScore: 10 },
    { name: "Vitamin A (Retinol)", metric_id: METRIC_IDS.VITAMIN_A, tier: "C", targetScore: 10 },
    { name: "Selenium", metric_id: METRIC_IDS.SELENIUM, tier: "C", targetScore: 10 },
    {
        name: "Vitamin B combined",
        tier: "C",
        targetScore: 15,
        relatedNames: ["Vitamin B6 (Pyridoxine)", "Vitamin B1 (Thiamine)", "Vitamin B2 (Riboflavin)", "Vitamin B5 (Pantothenic Acid)"],
        relatedMetricIds: [METRIC_IDS.VITAMIN_B6, METRIC_IDS.VITAMIN_B1, METRIC_IDS.VITAMIN_B2, METRIC_IDS.VITAMIN_B5],
        rule: 'lowest'
    },
    { name: "Vitamin B3 (Niacin)", metric_id: METRIC_IDS.VITAMIN_B3, tier: "C", targetScore: 15 },
    { name: "Vitamin E", metric_id: METRIC_IDS.VITAMIN_E, tier: "C", targetScore: 10 },
    {
        name: "Serum Zinc",
        metric_id: METRIC_IDS.SERUM_ZINC,
        tier: "C",
        targetScore: 15,
        relatedNames: ["Zinc"],
        relatedMetricIds: [METRIC_IDS.ZINC],
        rule: 'lowest'
    },
    { name: "Estimated Glomerular Filtration Rate (EGFR)", metric_id: METRIC_IDS.EGFR, tier: "C", targetScore: 10 },
    { name: "Magnesium", metric_id: METRIC_IDS.MAGNESIUM, tier: "C", targetScore: 15 },




];
