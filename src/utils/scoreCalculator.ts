import { TIER_DATA, type TieredBiomarker } from '../data/tierData';
import type { BloodBiomarker, HealthDataResponse } from '../services/api';
import { BASELINE_CAPPING_RULES } from '../data/baselineCappingRules';
import { METRIC_IDS } from '../data/biomarkerIds';
import { CONTEXT_RULES } from '../data/contextRules';
import { CAPPING_RULES } from '../data/cappingRules';

/**
 * Determines the rating rank for a given biomarker value.
 */
export function getRatingRank(biomarker: BloodBiomarker): number | null {
    if (!biomarker.ranges || biomarker.ranges.length === 0) {
        return null;
    }

    const matchingRange = biomarker.ranges.find(r => r.display_rating === biomarker.display_rating);
    return matchingRange?.rating_rank ?? null;
}

/**
 * Calculates custom rank for BMI based on specific ranges.
 */
export function getBMIRank(value: number | string | undefined): number | null {
    if (value === undefined || value === null || value === '') return null;
    const bmi = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(bmi)) return null;

    if (bmi < 19) return 3;
    if (bmi <= 23) return 5;
    if (bmi <= 25) return 3;
    if (bmi <= 28) return 2;
    return 1; // 28-30 and > 30 are both rank 1
}

/**
 * Get rating rank for a given NLR (Neutrophil-to-Lymphocyte Ratio) value.
 *
 * NLR = NEUTROPHILS / LYMPHOCYTES
 *
 * Ranges (checked in order of specificity):
 * - NLR > 3.5: rank 1
 * - NLR 2.01 to 3.5: rank 2
 * - NLR 1.25 to 2.0: rank 3
 * - NLR 0.76 to 1.24: rank 4
 * - NLR 0.7 to 0.75: rank 5
 * - NLR 0.5 to 0.69: rank 2
 * - NLR < 0.5: rank 1
 */
export function getNlrRank(nlrValue: number | string | undefined | null): number {
    if (nlrValue === null || nlrValue === undefined || nlrValue === '') return 0;

    const nlr = typeof nlrValue === 'string' ? parseFloat(nlrValue) : nlrValue;
    if (isNaN(nlr)) return 0;

    // Check ranges in order of specificity (most specific first)
    if (nlr > 3.5) return 1;
    if (nlr >= 2.01) return 2;
    if (nlr >= 1.25) return 3;
    if (nlr >= 0.76) return 4;
    if (nlr >= 0.70) return 5;
    if (nlr >= 0.5) return 2;
    if (nlr < 0.5) return 1;

    return 0;
}

/**
 * Audit log for a single biomarker calculation.
 */
export interface BiomarkerAudit {
    name: string;
    metricId?: string;
    tier?: string; // Added to track which tier the marker belongs to
    apiNameUsed: string | null; // For display purposes
    originalRank: number | null;
    cappedRank: number | null;
    maxRank: number;
    targetScore: number;
    finalScore: number;
    ruleApplied: string | null;
    ruleTitle?: string;
    isMissing: boolean;
    isSubstitute: boolean;
    substituteValue?: string | number;
    value?: number | string;
    unit?: string;
}

/**
 * Calculates the rating rank for a tiered biomarker.
 * Handles primary names, related names, substitutes, and combined (lowest) logic based on Metric IDs.
 * Returns null if the biomarker is missing from the API.
 */
export function calculateTierRank(tierItem: TieredBiomarker, bloodData: BloodBiomarker[], bmi: number | null = null): { rank: number | null, audit: Partial<BiomarkerAudit> } {
    const audit: Partial<BiomarkerAudit> = {
        name: tierItem.name,
        metricId: tierItem.metric_id,
        isMissing: true,
        isSubstitute: false
    };

    // 1. FIRST check whether the primary marker exists (by ID preferably, fallback to name)
    let primaryBiomarker: BloodBiomarker | undefined;
    if (tierItem.metric_id) {
        primaryBiomarker = bloodData.find(bm => bm.metric_id === tierItem.metric_id);
    }
    // Fallback? If ID not found or missing from data, try name?
    // User requested ID usage. Let's stick to ID if available, but for robustness check name if ID didn't match.
    if (!primaryBiomarker) {
        primaryBiomarker = bloodData.find(bm => bm.display_name === tierItem.name);
    }

    if (primaryBiomarker && primaryBiomarker.value !== null && primaryBiomarker.value !== undefined) {
        // Special Case: WBC (NLR Calculation needs to be compared, so don't return early)
        if (tierItem.metric_id !== METRIC_IDS.WBC) {
            audit.apiNameUsed = primaryBiomarker.display_name;
            audit.isMissing = false;
            audit.value = primaryBiomarker.value;
            audit.unit = primaryBiomarker.unit;
            return { rank: getRatingRank(primaryBiomarker), audit };
        }
    }

    // 2. If the primary is NOT available, check the relatedMetricIds
    if (!tierItem.relatedMetricIds || tierItem.relatedMetricIds.length === 0) {
        // Fallback to relatedNames if metric IDs are missing (legacy support)
        if (!tierItem.relatedNames || tierItem.relatedNames.length === 0) {
            return { rank: null, audit };
        }
    }

    const relatedIds = tierItem.relatedMetricIds || [];
    // Also consider relatedNames if needed, but prioritize IDs.

    if (tierItem.rule === 'substitute') {
        audit.ruleApplied = 'substitute';
        // Return rank from first available related ID
        for (const id of relatedIds) {
            // Special Case: BMI fallback logic
            if (id === METRIC_IDS.BMI) {
                if (bmi !== null) {
                    audit.apiNameUsed = "Body Mass Index (BMI)";
                    audit.isMissing = false;
                    audit.isSubstitute = true;
                    audit.substituteValue = bmi;
                    return { rank: getBMIRank(bmi), audit };
                } else {
                    // Fallback to hardcoded value if dynamic BMI is not available
                    audit.apiNameUsed = "Body Mass Index (BMI)";
                    audit.isMissing = false;
                    audit.isSubstitute = true;
                    audit.substituteValue = 26.5;
                    return { rank: getBMIRank(26.5), audit };
                }
            }

            const biomarker = bloodData.find(bm => bm.metric_id === id);
            if (biomarker && biomarker.value !== null && biomarker.value !== undefined) {
                audit.apiNameUsed = biomarker.display_name;
                audit.isMissing = false;
                audit.isSubstitute = true;
                audit.value = biomarker.value;
                audit.unit = biomarker.unit;
                return { rank: getRatingRank(biomarker), audit };
            }
        }
        return { rank: null, audit };
    }

    if (tierItem.rule === 'lowest') {
        audit.ruleApplied = 'lowest';

        // Special Case: WBC (NLR Calculation)
        if (tierItem.metric_id === METRIC_IDS.WBC) {
            let primaryRank: number | null = null;
            if (primaryBiomarker && primaryBiomarker.value !== null && primaryBiomarker.value !== undefined) {
                primaryRank = getRatingRank(primaryBiomarker);
            }

            const neutrophils = bloodData.find(bm => bm.metric_id === METRIC_IDS.NEUTROPHILS);
            const lymphocytes = bloodData.find(bm => bm.metric_id === METRIC_IDS.LYMPHOCYTES);

            let nlrRank: number | null = null;
            let nlrValue: number | null = null;

            if (neutrophils && lymphocytes &&
                neutrophils.value !== null && neutrophils.value !== undefined &&
                lymphocytes.value !== null && lymphocytes.value !== undefined &&
                parseFloat(String(lymphocytes.value)) > 0) {

                nlrValue = parseFloat(String(neutrophils.value)) / parseFloat(String(lymphocytes.value));
                nlrRank = getNlrRank(nlrValue);
            }

            if (primaryRank !== null || nlrRank !== null) {
                audit.isMissing = false;

                if (primaryRank !== null && nlrRank !== null) {
                    const finalRank = Math.min(primaryRank, nlrRank);
                    audit.apiNameUsed = primaryBiomarker?.display_name || tierItem.name;
                    audit.ruleApplied = `lowest (WBC: ${primaryRank}, NLR: ${nlrRank})`;
                    if (nlrRank < primaryRank) {
                        audit.apiNameUsed = "Neutrophil-to-Lymphocyte Ratio (NLR)";
                        audit.isSubstitute = true;
                        audit.substituteValue = nlrValue?.toFixed(2);
                    }
                    return { rank: finalRank, audit };
                } else if (primaryRank !== null) {
                    audit.apiNameUsed = primaryBiomarker?.display_name || tierItem.name;
                    return { rank: primaryRank, audit };
                } else {
                    audit.apiNameUsed = "Neutrophil-to-Lymphocyte Ratio (NLR)";
                    audit.isSubstitute = true;
                    audit.substituteValue = nlrValue?.toFixed(2);
                    return { rank: nlrRank, audit };
                }
            }
        }

        // Collect all available ranks from relatedIds/names and return the lowest
        const availableBiomarkers = relatedIds
            .map(id => bloodData.find(bm => bm.metric_id === id))
            .filter((bm): bm is BloodBiomarker => bm !== undefined && bm.value !== null && bm.value !== undefined);

        if (availableBiomarkers.length > 0) {
            const ranksWithNames = availableBiomarkers.map(bm => ({
                name: bm.display_name,
                rank: getRatingRank(bm)
            })).filter(r => r.rank !== null) as { name: string, rank: number }[];

            if (ranksWithNames.length > 0) {
                const lowest = ranksWithNames.reduce((prev, curr) => prev.rank < curr.rank ? prev : curr);
                audit.apiNameUsed = lowest.name;
                audit.isMissing = false;
                const lowestBiomarker = availableBiomarkers.find(bm => bm.display_name === lowest.name);
                if (lowestBiomarker) {
                    audit.value = lowestBiomarker.value;
                    audit.unit = lowestBiomarker.unit;
                }
                return { rank: lowest.rank, audit };
            }
        }
        return { rank: null, audit };
    }

    return { rank: null, audit };
}

/**
 * Calculates the maximum possible rating rank for a biomarker.
 * This is typically 5, but can vary based on the biomarker's ranges.
 */
export function getMaxRatingRank(biomarker: BloodBiomarker): number {
    if (!biomarker.ranges || biomarker.ranges.length === 0) {
        return 0; // Default max rank
    }

    const ranks = biomarker.ranges.map(r => r.rating_rank).filter((r): r is number => r !== null && r !== undefined);
    return ranks.length > 0 ? Math.max(...ranks) : 5;
}

/**
 * Calculates the maximum possible rating rank for a tiered biomarker.
 */
export function calculateMaxTierRank(tierItem: TieredBiomarker, bloodData: BloodBiomarker[]): number {
    const idsToSearch = [tierItem.metric_id, ...(tierItem.relatedMetricIds || [])].filter((id): id is string => !!id);

    // For all rule types, get the max rank from any of the related biomarkers based on ID
    const maxRanks = idsToSearch
        .map(id => {
            const biomarker = bloodData.find(bm => bm.metric_id === id);
            return biomarker ? getMaxRatingRank(biomarker) : 5;
        })
        .filter((r): r is number => r !== null);

    return maxRanks.length > 0 ? Math.max(...maxRanks) : 5;
}


/**
 * Evaluates all context rules and returns actions for specific biomarker names.
 * Biomarkers are NOT suppressed if they are simply missing from the API.
 * They are only suppressed based on the explicit rules in contextRules.ts.
 * 
 * @param currentRanks - Map of Metric ID -> Rank
 */
export function applyContextRules(
    currentRanks: Record<string, number | null>
): Record<string, { action: 'suppress' | 'cap'; capValue?: number; ruleTitle?: string }> {
    const results: Record<string, { action: 'suppress' | 'cap'; capValue?: number; ruleTitle?: string }> = {};

    CONTEXT_RULES.forEach(rule => {
        const mainId = rule.mainMetricId;
        const result = rule.evaluate(currentRanks);
        if (result.action !== 'none') {
            results[mainId] = {
                action: result.action as 'suppress' | 'cap',
                capValue: result.capValue,
                ruleTitle: rule.ruleTitle
            };
        }
    });

    return results;
}

/**
 * Evaluates all capping rules and returns actions for specific biomarker names.
 * Biomarkers are NOT suppressed if they are simply missing from the API.
 * 
 * @param currentRanks - Map of Metric ID -> Rank
 */
export function applyCappingRules(
    currentRanks: Record<string, number | null>
): Record<string, { action: 'suppress' | 'cap'; capValue?: number; ruleTitle?: string }> {
    const results: Record<string, { action: 'suppress' | 'cap'; capValue?: number; ruleTitle?: string }> = {};

    CAPPING_RULES.forEach(rule => {
        const mainId = rule.mainMetricId;
        const result = rule.evaluate(currentRanks);
        if (result.action !== 'none') {
            results[mainId] = {
                action: result.action as 'suppress' | 'cap',
                capValue: result.capValue,
                ruleTitle: rule.ruleTitle
            };
        }
    });

    return results;
}

/**
 * Calculates the final score for a biomarker based on its capped rank.
 * Formula: final_score = (capped_rank / max_rank) × target_score
 */
export function calculateFinalScore(
    cappedRank: number,
    maxRank: number,
    targetScore: number
): number {
    const divisor = 5;
    const result = (cappedRank / divisor) * targetScore;
    if (import.meta.env.MODE === 'development' && result === targetScore && cappedRank < maxRank) {
        console.warn(`Suspicious Score Calc: Rank ${cappedRank}/${maxRank} * ${targetScore} = ${result}`);
    }
    return result;
}

/**
 * Tier totals interface
 */
export interface TierTotals {
    A: number;
    B: number;
    C: number;
}

/**
 * Tier scores interface (includes both total and achieved)
 */
export interface TierScores {
    A: { total: number; achieved: number };
    B: { total: number; achieved: number };
    C: { total: number; achieved: number };
}

/**
 * Baseline score result interface
 */
export interface BaselineScoreResult {
    originalTotals: TierTotals;
    finalizedScores: TierScores;
    normalizedScores: TierTotals;
    totalBaselineScore: number;
    totalOriginalScore: number;
    cappingResult: BaselineCappingResult;
    isCappedOverall: boolean;
    preCappedScore: number;
    markerAudits: BiomarkerAudit[];
}

/**
 * Calculate original tier totals from TIER_DATA.
 */
export function calculateOriginalTierTotals(): TierTotals {
    const totals: TierTotals = { A: 0, B: 0, C: 0 };

    TIER_DATA.forEach(item => {
        const tier = item.tier as 'A' | 'B' | 'C';
        if (tier in totals) {
            totals[tier] += item.targetScore;
        }
    });

    return totals;
}

/**
 * Normalize a tier score to the original tier total.
 */
export function normalizeTierScore(
    finalAchievedScore: number,
    finalTierTotalScore: number,
    originalTierTotalScore: number
): number {
    if (finalTierTotalScore === 0) return 0;
    return (finalAchievedScore / finalTierTotalScore) * originalTierTotalScore;
}

export interface BaselineCappingResult {
    lowestCap: number | null;
    appliedRules: { biomarkerName: string; rank: number; capScore: number }[];
    cappingAudits: BiomarkerAudit[];
}

/**
 * Calculates the overall baseline score cap based on various biomarkers.
 * Returns the lowest applicable cap score and the reasons.
 */
export function getBaselineCappingResult(bloodData: BloodBiomarker[], tierData: TieredBiomarker[], bmi: number | null = null): BaselineCappingResult {
    let lowestCap: number | null = null;
    const appliedRules: { biomarkerName: string; rank: number; capScore: number }[] = [];
    const cappingAudits: BiomarkerAudit[] = [];

    BASELINE_CAPPING_RULES.forEach(rule => {
        let rank: number | null = null;
        // Use ID for audit name initially? Or Human Name?
        // Let's use ID for lookup, but try to find name for display.
        const ruleId = rule.metricId;

        let auditData: Partial<BiomarkerAudit> = {
            name: rule.metricId, // Initialize with ID
            isMissing: true
        };

        // 1. Check if it's a tiered biomarker to handle complex rules (like Body Fat % substitution)
        const tieredItem = tierData.find(item => item.metric_id === ruleId);
        if (tieredItem) {
            auditData.name = tieredItem.name; // Update to human readable name
            const { rank: tierRank, audit: tierAudit } = calculateTierRank(tieredItem, bloodData, bmi);
            rank = tierRank;
            auditData = { ...auditData, ...tierAudit };
        } else {
            // 2. Otherwise look it up directly in bloodData
            const biomarker = bloodData.find(bm => bm.metric_id === ruleId);
            if (biomarker) {
                auditData.name = biomarker.display_name;
                rank = getRatingRank(biomarker);
                auditData.apiNameUsed = biomarker.display_name;
                auditData.isMissing = false;
                auditData.value = biomarker.value;
                auditData.unit = biomarker.unit;
            }
        }

        const audit: BiomarkerAudit = {
            name: auditData.name || ruleId,
            metricId: ruleId,
            apiNameUsed: auditData.apiNameUsed || null,
            originalRank: rank,
            cappedRank: rank,
            maxRank: 5, // Default max rank
            targetScore: tieredItem ? tieredItem.targetScore : 0, // Include target score
            finalScore: 0,
            ruleApplied: auditData.ruleApplied || null,
            isMissing: auditData.isMissing ?? true,
            isSubstitute: auditData.isSubstitute ?? false,
            substituteValue: auditData.substituteValue,
            value: auditData.value,
            unit: auditData.unit,
            tier: tieredItem?.tier
        };

        if (import.meta.env.MODE === 'development') {
            console.log(`Checking Rule: ${auditData.name} (${ruleId}) | Rank: ${rank}`);
        }
        cappingAudits.push(audit);

        if (rank !== null) {
            const applicableCap = rule.caps.find(c => c.rank === rank);
            if (applicableCap) {
                if (lowestCap === null || applicableCap.capScore < lowestCap) {
                    lowestCap = applicableCap.capScore;
                }
                // Try to find a human readable name if possible, otherwise ID
                const display = audit.name;
                appliedRules.push({
                    biomarkerName: display,
                    rank: rank,
                    capScore: applicableCap.capScore
                });
            }
        }
    });

    return { lowestCap, appliedRules, cappingAudits };
}

/**
 * Calculates the complete baseline score result for a user.
 */
export function calculateBaselineScore(
    healthData: HealthDataResponse,
    bmi: number | null = null
): BaselineScoreResult | null {
    if (!healthData?.data?.blood?.data) return null;

    const bloodData = healthData.data.blood.data;

    // 1. Calculate Ranks & Populate Map
    const currentRanks: Record<string, number | null> = {};

    // First, populate ranks for ALL available blood data directly
    bloodData.forEach(bm => {
        if (bm.metric_id) {
            const rank = getRatingRank(bm);
            currentRanks[bm.metric_id] = rank;
        }
    });

    // Then, ensure tiered items are also captured
    TIER_DATA.forEach(tierItem => {
        const { rank } = calculateTierRank(tierItem, bloodData, bmi);
        if (tierItem.metric_id) {
            if (currentRanks[tierItem.metric_id] === undefined) {
                currentRanks[tierItem.metric_id] = rank;
            }
        }
    });

    // 2. Apply Rules
    const contextResults = applyContextRules(currentRanks);
    const cappingResults = applyCappingRules(currentRanks);

    // 3. Calculate Scores
    const finalizedScores: TierScores = {
        A: { total: 0, achieved: 0 },
        B: { total: 0, achieved: 0 },
        C: { total: 0, achieved: 0 }
    };
    const markerAudits: BiomarkerAudit[] = [];

    TIER_DATA.forEach(item => {
        const { rank, audit } = calculateTierRank(item, bloodData, bmi);

        // Determine final rank after rules (using ID lookup)
        const contextAction = item.metric_id ? contextResults[item.metric_id] : undefined;
        const cappingAction = item.metric_id ? cappingResults[item.metric_id] : undefined;

        let cappedRank = rank;
        let ruleApplied: string | null = audit.ruleApplied || null;
        let ruleTitle: string | undefined = audit.ruleTitle;

        // Priority 1: Context Rules (Suppress/Cap)
        if (contextAction?.action === 'suppress') {
            cappedRank = null;
            ruleApplied = (ruleApplied ? ruleApplied + ' + ' : '') + 'suppress';
            ruleTitle = contextAction.ruleTitle;
        } else if (contextAction?.action === 'cap') {
            const capVal = contextAction.capValue;
            if (capVal !== undefined && cappedRank !== null && cappedRank > capVal) {
                cappedRank = capVal;
                ruleApplied = (ruleApplied ? ruleApplied + ' + ' : '') + 'cap';
                ruleTitle = contextAction.ruleTitle;
            }
        }

        // Priority 2: Capping Rules
        if (cappingAction?.action === 'suppress') {
            cappedRank = null;
            ruleApplied = (ruleApplied ? ruleApplied + ' + ' : '') + 'suppress';
            ruleTitle = cappingAction.ruleTitle;
        } else if (cappingAction?.action === 'cap') {
            const capVal = cappingAction.capValue;
            if (capVal !== undefined && cappedRank !== null && cappedRank > capVal) {
                cappedRank = capVal;
                ruleApplied = (ruleApplied ? ruleApplied + ' + ' : '') + 'cap';
                ruleTitle = cappingAction.ruleTitle;
            }
        }

        // Calculate Max Rank
        const maxRank = calculateMaxTierRank(item, bloodData);

        // Calculate Final Score
        let finalScore = 0;
        if (cappedRank !== null) {
            finalScore = calculateFinalScore(cappedRank, maxRank, item.targetScore);
        }

        // Create Audit Entry
        const finalAudit: BiomarkerAudit = {
            name: item.name,
            tier: item.tier,
            apiNameUsed: audit.apiNameUsed || null,
            originalRank: rank,
            cappedRank: cappedRank,
            maxRank: maxRank,
            targetScore: item.targetScore,
            finalScore: finalScore,
            ruleApplied: ruleApplied,
            ruleTitle: ruleTitle,
            isMissing: audit.isMissing ?? true,
            isSubstitute: audit.isSubstitute ?? false,
            substituteValue: audit.substituteValue,
            value: audit.value,
            unit: audit.unit
        };
        markerAudits.push(finalAudit);

        const tier = item.tier as 'A' | 'B' | 'C';
        if (cappedRank !== null) {
            finalizedScores[tier].achieved += finalScore;
            finalizedScores[tier].total += item.targetScore;
        }
    });

    // Calculate Totals & Normalization
    const originalTotals = calculateOriginalTierTotals();
    const normalizedScores: TierTotals = {
        A: normalizeTierScore(finalizedScores.A.achieved, finalizedScores.A.total, originalTotals.A),
        B: normalizeTierScore(finalizedScores.B.achieved, finalizedScores.B.total, originalTotals.B),
        C: normalizeTierScore(finalizedScores.C.achieved, finalizedScores.C.total, originalTotals.C),
    };

    const totalBaselineScore = normalizedScores.A + normalizedScores.B + normalizedScores.C;
    const totalOriginalScore = originalTotals.A + originalTotals.B + originalTotals.C;

    // Baseline Capping
    const cappingResult = getBaselineCappingResult(bloodData, TIER_DATA, bmi);
    let finalBaselineScore = totalBaselineScore;
    let isCappedOverall = false;

    if (cappingResult.lowestCap !== null) {
        const currentPercentage = (totalBaselineScore / totalOriginalScore) * 100;
        if (currentPercentage > cappingResult.lowestCap) {
            finalBaselineScore = (cappingResult.lowestCap / 100) * totalOriginalScore;
            isCappedOverall = true;
        }
    }

    return {
        originalTotals,
        finalizedScores,
        normalizedScores,
        totalBaselineScore: finalBaselineScore,
        totalOriginalScore,
        cappingResult,
        isCappedOverall,
        preCappedScore: totalBaselineScore,
        markerAudits
    };
}

