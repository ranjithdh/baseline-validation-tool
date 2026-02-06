export interface BaselineCapRule {
    biomarkerName: string;
    caps: { rank: number; capScore: number }[];
}

export const BASELINE_CAPPING_RULES: BaselineCapRule[] = [
    {
        biomarkerName: "Haemoglobin A1C (HbA1C)",
        caps: [
            { rank: 1, capScore: 65 },
            { rank: 2, capScore: 75 },
            { rank: 3, capScore: 85 }
        ]
    },
    {
        biomarkerName: "Fasting Insulin",
        caps: [
            { rank: 1, capScore: 65 },
            { rank: 2, capScore: 75 }
        ]
    },
    {
        biomarkerName: "Body Fat %",
        caps: [
            { rank: 1, capScore: 70 },
            { rank: 2, capScore: 80 }
        ]
    },
    {
        biomarkerName: "VO2 Max",
        caps: [
            { rank: 1, capScore: 70 },
            { rank: 2, capScore: 80 }
        ]
    },
    {
        biomarkerName: "Non-HDL Cholesterol",
        caps: [
            { rank: 1, capScore: 70 },
            { rank: 2, capScore: 80 }
        ]
    },
    {
        biomarkerName: "Lipoprotein A [LP(A)]",
        caps: [
            { rank: 1, capScore: 75 }
        ]
    },
    {
        biomarkerName: "High Sensitivity C-Reactive Protein (hs-CRP)",
        caps: [
            { rank: 1, capScore: 70 },
            { rank: 2, capScore: 80 }
        ]
    },
    {
        biomarkerName: "Gamma-Glutamyl Transferase (GGT)",
        caps: [
            { rank: 1, capScore: 70 },
            { rank: 2, capScore: 80 }
        ]
    },
    {
        biomarkerName: "Thyroid Stimulating Hormone (TSH)",
        caps: [
            { rank: 1, capScore: 70 },
            { rank: 2, capScore: 80 }
        ]
    },
    {
        biomarkerName: "Vitamin B12 (Cobalamin)",
        caps: [
            { rank: 1, capScore: 70 },
            { rank: 2, capScore: 80 }
        ]
    },
    {
        biomarkerName: "Ferritin",
        caps: [
            { rank: 1, capScore: 75 }
        ]
    },
    {
        biomarkerName: "PHQ-2",
        caps: [
            { rank: 1, capScore: 65 },
            { rank: 2, capScore: 75 }
        ]
    },
    {
        biomarkerName: "GAD-2",
        caps: [
            { rank: 1, capScore: 65 },
            { rank: 2, capScore: 75 }
        ]
    },
    {
        biomarkerName: "Vitamin D",
        caps: [
            { rank: 1, capScore: 65 },
            { rank: 2, capScore: 75 }
        ]
    },
    {
        biomarkerName: "Aspartate Aminotransferase (SGOT)",
        caps: [
            { rank: 1, capScore: 60 },
            { rank: 2, capScore: 65 }
        ]
    },
    {
        biomarkerName: "Alanine Transaminase (SGPT)",
        caps: [
            { rank: 1, capScore: 60 },
            { rank: 2, capScore: 65 }
        ]
    }
];
