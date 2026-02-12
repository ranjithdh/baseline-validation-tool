# Baseline Validation Tool

This tool is a specialized engine for auditing and validating health data biomarkers and calculating the complex **Baseline Score**.

## 📊 Baseline Score Calculation Logic

The calculation of the Baseline Score is a multi-phase process that involves biomarker ranking, tiered normalization, and overall score capping.

### 1. Biomarker-Level Scoring
For each biomarker, a **Rating Rank** is determined:
- **Rank Range**: 1 to 5.
- **Source**: The rank is derived from the `rating_rank` associated with the biomarker's `display_rating` (e.g., Optimal, Normal, Borderline) in the API response.
- **Special Calculations**:
    - **BMI**: Calculated from height and weight if not directly available.
    - **NLR (Neutrophil-to-Lymphocyte Ratio)**: Calculated as `Neutrophils / Lymphocytes`.

### 2. Tiered Structure & Target Scores
Biomarkers are grouped into three priority tiers with fixed original total points:
- **Tier A (600 pts)**: Essential biomarkers (e.g., HbA1c, Insulin, hs-CRP).
- **Tier B (240 pts)**: Secondary priority biomarkers (e.g., Lipid profile, Blood Pressure).
- **Tier C (160 pts)**: Tertiary and nutrient biomarkers (e.g., Vitamin levels, Iron).

### 3. Rule Applications
Before final scoring, several rules may modify the ranks:
- **Context Rules**: Adjust or suppress ranks based on other related biomarkers.
- **Capping Rules**: Limit individual biomarker ranks to a specific maximum based on clinical thresholds.
- **Substitution/Lowest Logic**: If a primary biomarker is missing, a substitute is used, or the lowest rank among a group of related markers is selected.

### 4. Score Normalization
To ensure the score reflects the original 1000-point scale regardless of data availability:
1.  **Metric Score**: `(Capped_Rank / 5) * Target_Score`
2.  **Tier Achievement**: Sum of achieved scores for available markers in a tier.
3.  **Tier Potential**: Sum of target scores for available markers in that same tier.
4.  **Normalized Tier Score**: `(Tier_Achievement / Tier_Potential) * Original_Tier_Total`

### 5. Final Baseline Score & Global Capping
The final score is the sum of the normalized scores from Tiers A, B, and C (Max 1000).

**Overall Capping**: 
Certain critical biomarkers (like HbA1c, Fasting Insulin, Body Fat %) can trigger a global cap. If any such biomarker's rank matches a capping rule, the final score percentage is capped at the lowest applicable `capScore` (e.g., 65%, 75%, 85%).
- **Formula**: `Final_Score = min(Total_Baseline_Score, (Lowest_Cap / 100) * 1000)`

---

## 🛠 Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Styling**: Vanilla CSS (Premium Aesthetics)
- **State Management**: React Hooks (useMemo for heavy calculations)
- **API**: DH Staging APIs V4
