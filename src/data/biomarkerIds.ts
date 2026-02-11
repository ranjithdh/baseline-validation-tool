export const METRIC_IDS = {
    CORTISOL: "BD10015",
    EGFR: "BD10022",
    FASTING_INSULIN: "BD10024",
    FERRITIN: "BD10025",
    FOLATE: "BD10026",
    FREE_TESTOSTERONE: "BD10027",
    GGT: "BD10028",
    HAEMOGLOBIN: "BD10031", // "HB" mapped to Haemoglobin
    HBA1C: "BD10032",
    HS_CRP: "BD10033",
    HDL: "BD10034",
    HOMOCYSTEINE: "BD10035",
    LPA: "BD10039",
    LDL: "BD10040",
    LYMPHOCYTES: "BD10041",
    MAGNESIUM: "BD10043",
    NEUTROPHILS: "BD10050",
    NON_HDL: "BD10052",
    PP_INSULIN: "BD10060",
    RDW_CV: "BD10065", // "RDW" usually means RDW-CV in this context
    SELENIUM: "BD10066",
    ALBUMIN: "BD10067",
    IRON: "BD10069",
    SHBG: "BD10070",
    TSH: "BD10073",
    RBC: "BD10079",
    TOTAL_TESTOSTERONE: "BD10080",
    WBC: "BD10083",
    TRIGLYCERIDES: "BD10085",
    URIC_ACID: "BD10089",
    VITAMIN_A: "BD10091", // Retinol
    VITAMIN_B1: "BD10092",
    VITAMIN_B12: "BD10093",
    VITAMIN_B2: "BD10094",
    VITAMIN_B3: "BD10095",
    VITAMIN_B5: "BD10096",
    VITAMIN_B6: "BD10097",
    VITAMIN_D: "BD10100",
    VITAMIN_E: "BD10101",
    ZINC: "BD10102",
    IL_6: "BD10108",
    SERUM_ZINC: "BD10149",
    HOMA_IR: "BD10150",
    FREE_T3: "BD10152",
    FREE_T4: "BD10153",
    SMALL_LDL: "BD10154",
    APO_B: "BD10006",
    BMI: "CL10001",
    VO2_MAX: "CL10005",
    BODY_FAT: "DV10001",
    DIASTOLIC_BP: "DV10003",
    SYSTOLIC_BP: "DV10007",
    GAD_2: "GAD-2",
    PHQ_2: "PHQ-2",


    // SGPT (ALT): BD10001
    SGPT: "BD10001",
    // SGOT (AST): BD10007
    SGOT: "BD10007",

    // A/G Ratio: BD10002
    AG_RATIO: "BD10002",
    // ALP: BD10003
    ALP: "BD10003",
    // Urea / BUN: BD10013
    BUN: "BD10013",
    // Calcium: BD10014
    CALCIUM: "BD10014",
    // CPK: BD10016
    CPK: "BD10016",
    // Creatinine: BD10017
    CREATININE: "BD10017",
    // DHEAS: BD10018
    DHEAS: "BD10018",
    // Bilirubin Direct: BD10011
    BILIRUBIN_DIRECT: "BD10011",
    // Bilirubin Indirect: BD10012
    BILIRUBIN_INDIRECT: "BD10012",
    // Basophils: BD10010
    BASOPHILS_PCT: "BD10010",
    BASOPHILS_ABS: "BD10009",
    // Average Blood Glucose: BD10008
    AVG_GLUCOSE: "BD10008",

    // Calculated/Other
    NLR: "NLR_CALC", // This might need a real ID if provided, otherwise allow calc? 
    // User didn't provide NLR. But NLR is calculated from Neutrophils/Lymphocytes.
    // I'll use a placeholder or handle it in logic.

};

export const NAME_TO_METRIC_ID: Record<string, string> = {
    "Cortisol": METRIC_IDS.CORTISOL,
    "Estimated Glomerular Filtration Rate (EGFR)": METRIC_IDS.EGFR,
    "Fasting Insulin": METRIC_IDS.FASTING_INSULIN,
    "Ferritin": METRIC_IDS.FERRITIN,
    "Folate": METRIC_IDS.FOLATE,
    "Free Testosterone": METRIC_IDS.FREE_TESTOSTERONE,
    "Gamma-Glutamyl Transferase (GGT)": METRIC_IDS.GGT,
    "Haemoglobin": METRIC_IDS.HAEMOGLOBIN,
    "Haemoglobin A1C (HbA1C)": METRIC_IDS.HBA1C,
    "High Sensitivity C-Reactive Protein (hs-CRP)": METRIC_IDS.HS_CRP,
    "HDL Cholesterol": METRIC_IDS.HDL,
    "Homocysteine": METRIC_IDS.HOMOCYSTEINE,
    "Lipoprotein A [LP(A)]": METRIC_IDS.LPA,
    "LDL Cholesterol": METRIC_IDS.LDL,
    "Lymphocytes": METRIC_IDS.LYMPHOCYTES,
    "Magnesium": METRIC_IDS.MAGNESIUM,
    "Neutrophils": METRIC_IDS.NEUTROPHILS,
    "Non-HDL Cholesterol": METRIC_IDS.NON_HDL,
    "Postprandial (PP) Insulin": METRIC_IDS.PP_INSULIN,
    "Red Cell Distribution Width – Coefficient Of Variation (RDW-CV)": METRIC_IDS.RDW_CV,
    "Selenium": METRIC_IDS.SELENIUM,
    "Serum Albumin": METRIC_IDS.ALBUMIN,
    "Iron": METRIC_IDS.IRON,
    "Sex Hormone Binding Globulin (SHBG)": METRIC_IDS.SHBG,
    "Thyroid Stimulating Hormone (TSH)": METRIC_IDS.TSH,
    "Total RBC": METRIC_IDS.RBC,
    "Total Testosterone": METRIC_IDS.TOTAL_TESTOSTERONE,
    "Total WBC": METRIC_IDS.WBC,
    "Triglycerides (TGL)": METRIC_IDS.TRIGLYCERIDES,
    "Uric Acid": METRIC_IDS.URIC_ACID,
    "Vitamin A (Retinol)": METRIC_IDS.VITAMIN_A,
    "Vitamin B1 (Thiamine)": METRIC_IDS.VITAMIN_B1,
    "Vitamin B12 (Cobalamin)": METRIC_IDS.VITAMIN_B12,
    "Vitamin B2 (Riboflavin)": METRIC_IDS.VITAMIN_B2,
    "Vitamin B3 (Niacin)": METRIC_IDS.VITAMIN_B3,
    "Vitamin B5 (Pantothenic Acid)": METRIC_IDS.VITAMIN_B5,
    "Vitamin B6 (Pyridoxine)": METRIC_IDS.VITAMIN_B6,
    "Vitamin D": METRIC_IDS.VITAMIN_D,
    "Vitamin E": METRIC_IDS.VITAMIN_E,
    "Zinc": METRIC_IDS.ZINC,
    "Serum Zinc": METRIC_IDS.SERUM_ZINC,
    "IL-6": METRIC_IDS.IL_6,
    "HOMA-IR": METRIC_IDS.HOMA_IR,
    "Free Triiodothyronine (FT3)": METRIC_IDS.FREE_T3,
    "Free thyroxine (FT4)": METRIC_IDS.FREE_T4,
    "Small Dense Low-Density Lipoprotein Cholesterol (sdLDL-C)": METRIC_IDS.SMALL_LDL,
    "Small LDL": METRIC_IDS.SMALL_LDL,
    "Apolipoprotein B (APO-B)": METRIC_IDS.APO_B,
    "Body Mass Index (BMI)": METRIC_IDS.BMI,
    "VO2 Max": METRIC_IDS.VO2_MAX,
    "Body Fat %": METRIC_IDS.BODY_FAT,
    "Diastolic Blood Pressure": METRIC_IDS.DIASTOLIC_BP,
    "Systolic Blood Pressure": METRIC_IDS.SYSTOLIC_BP,
    "GAD-2": METRIC_IDS.GAD_2,
    "PHQ-2": METRIC_IDS.PHQ_2,
};
