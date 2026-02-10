export interface TieredBiomarker {
    name: string;
    tier: 'A' | 'B' | 'C';
    targetScore: number;
    relatedNames?: string[];
    rule?: 'substitute' | 'lowest';
}

export const TIER_DATA: TieredBiomarker[] = [
    // Tier A (600 points total)
    { name: "Haemoglobin A1C (HbA1C)", tier: "A", targetScore: 60 },
    {
        name: "Insulin",
        tier: "A",
        targetScore: 60,
        relatedNames: ["Fasting Insulin", "Postprandial (PP) Insulin"],
        rule: 'lowest'
    },
    { name: "Non-HDL Cholesterol", tier: "A", targetScore: 60 },
    {
        name: "Body Fat %",
        tier: "A",
        targetScore: 60,
        relatedNames: ["Body Mass Index (BMI)"],
        rule: 'substitute'
    },
    { name: "VO2 Max", tier: "A", targetScore: 60 },
    { name: "High Sensitivity C-Reactive Protein (hs-CRP)", tier: "A", targetScore: 50 },
    { name: "Gamma-Glutamyl Transferase (GGT)", tier: "A", targetScore: 50 },
    { name: "Thyroid Stimulating Hormone (TSH)", tier: "A", targetScore: 30 },
    { name: "PHQ-2", tier: "A", targetScore: 30 },
    { name: "GAD-2", tier: "A", targetScore: 30 },
    { name: "Vitamin D", tier: "A", targetScore: 40 },
    { name: "Vitamin B12 (Cobalamin)", tier: "A", targetScore: 40 },
    { name: "Ferritin", tier: "A", targetScore: 30 },

    // Tier B (240 points total)
    { name: "Triglycerides (TGL)", tier: "B", targetScore: 30 },
    { name: "HDL Cholesterol", tier: "B", targetScore: 30 },
    { name: "Small Dense Low-Density Lipoprotein Cholesterol (sdLDL-C)", tier: "B", targetScore: 30 },
    { name: "Homocysteine", tier: "B", targetScore: 30 },
    // { name: "HOMA-IR", tier: "B", targetScore: 10 },
    { name: "Uric Acid", tier: "B", targetScore: 20 },
    { name: "Cortisol", tier: "B", targetScore: 20 },
    { name: "Free Triiodothyronine (FT3)", tier: "B", targetScore: 30 },
    { name: "Free thyroxine (FT4)", tier: "B", targetScore: 5 },
    { name: "Lipoprotein A [LP(A)]", tier: "B", targetScore: 15 },
    {
        name: "Blood Pressure",
        tier: "B",
        targetScore: 0,
        relatedNames: ["Systolic Blood Pressure", "Diastolic Blood Pressure"],
        rule: 'lowest'
    },
    {
        name: "Free Testosterone",
        tier: "B",
        targetScore: 20,
        relatedNames: ["Total Testosterone"],
        rule: 'substitute'
    },

    // Tier C (160 points total)
    { name: "Magnesium", tier: "C", targetScore: 15 },
    {
        name: "Serum Zinc",
        tier: "C",
        targetScore: 15,
        relatedNames: ["Zinc"],
        rule: 'lowest'
    },
    { name: "Selenium", tier: "C", targetScore: 10 },
    {
        name: "Vitamin B combined",
        tier: "C",
        targetScore: 15,
        relatedNames: ["Vitamin B6 (Pyridoxine)", "Vitamin B1 (Thiamine)", "Vitamin B2 (Riboflavin)", "Vitamin B5 (Pantothenic Acid)"],
        rule: 'lowest'
    },
    { name: "Vitamin E", tier: "C", targetScore: 10 },
    { name: "Folate", tier: "C", targetScore: 10 },
    { name: "Serum Albumin", tier: "C", targetScore: 10 },
    { name: "Estimated Glomerular Filtration Rate (EGFR)", tier: "C", targetScore: 10 },
    { name: "Vitamin A (Retinol)", tier: "C", targetScore: 10 },
    { name: "Red Cell Distribution Width – Coefficient Of Variation (RDW-CV)", tier: "C", targetScore: 10 },
    { name: "Total WBC", tier: "C", targetScore: 10 },
    {
        name: "Total RBC",
        tier: "C",
        targetScore: 10,
        relatedNames: ["Haemoglobin"],
        rule: 'lowest'
    },
    { name: "Iron", tier: "C", targetScore: 10 },
    { name: "Vitamin B3 (Niacin)", tier: "C", targetScore: 15 },
];
