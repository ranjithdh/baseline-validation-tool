import { TIER_DATA, type TieredBiomarker } from '../data/tierData';
import type { BloodBiomarker } from '../services/api';
import { BASELINE_CAPPING_RULES } from '../data/baselineCappingRules';

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
 * Calculates the rating rank for a tiered biomarker.
 * Handles primary names, related names, substitutes, and combined (lowest) logic.
 * Returns null if the biomarker is missing from the API.
 */
export function calculateTierRank(tierItem: TieredBiomarker, bloodData: BloodBiomarker[]): number | null {
    // 1. FIRST check whether the primary marker name exists and has a value
    const primaryBiomarker = bloodData.find(bm => bm.display_name === tierItem.name);
    if (primaryBiomarker && primaryBiomarker.value !== null && primaryBiomarker.value !== undefined) {
        return getRatingRank(primaryBiomarker);
    }

    // 2. If the name is NOT available, check the relatedNames
    if (!tierItem.relatedNames || tierItem.relatedNames.length === 0) {
        return null;
    }

    if (tierItem.rule === 'substitute') {
        // Return rank from first available related name
        for (const name of tierItem.relatedNames) {
            // Special Case: BMI fallback logic
            if (name === "Body Mass Index (BMI)") {
                return getBMIRank(21.36); // Hardcoded value as per user request
            }

            const biomarker = bloodData.find(bm => bm.display_name === name);
            if (biomarker && biomarker.value !== null && biomarker.value !== undefined) {
                return getRatingRank(biomarker);
            }
        }
        return null;
    }

    if (tierItem.rule === 'lowest') {
        // Collect all available ranks from relatedNames and return the lowest
        const ranks = tierItem.relatedNames
            .map(name => {
                const biomarker = bloodData.find(bm => bm.display_name === name);
                return biomarker ? getRatingRank(biomarker) : null;
            })
            .filter((r): r is number => r !== null);

        return ranks.length > 0 ? Math.min(...ranks) : null;
    }

    return null;
}

/**
 * Calculates the maximum possible rating rank for a biomarker.
 * This is typically 5, but can vary based on the biomarker's ranges.
 */
export function getMaxRatingRank(biomarker: BloodBiomarker): number {
    if (!biomarker.ranges || biomarker.ranges.length === 0) {
        return 5; // Default max rank
    }

    const ranks = biomarker.ranges.map(r => r.rating_rank).filter((r): r is number => r !== null && r !== undefined);
    return ranks.length > 0 ? Math.max(...ranks) : 5;
}

/**
 * Calculates the maximum possible rating rank for a tiered biomarker.
 */
export function calculateMaxTierRank(tierItem: TieredBiomarker, bloodData: BloodBiomarker[]): number {
    const namesToSearch = [tierItem.name, ...(tierItem.relatedNames || [])];

    // For all rule types, get the max rank from any of the related biomarkers
    const maxRanks = namesToSearch
        .map(name => {
            const biomarker = bloodData.find(bm => bm.display_name === name);
            return biomarker ? getMaxRatingRank(biomarker) : 5;
        })
        .filter((r): r is number => r !== null);

    return maxRanks.length > 0 ? Math.max(...maxRanks) : 5;
}

import { CONTEXT_RULES } from '../data/contextRules';
import { CAPPING_RULES } from '../data/cappingRules';

/**
 * Evaluates all context rules and returns actions for specific biomarker names.
 * Biomarkers are NOT suppressed if they are simply missing from the API.
 * They are only suppressed based on the explicit rules in contextRules.ts.
 */
export function applyContextRules(
    currentRanks: Record<string, number | null>
): Record<string, { action: 'suppress' | 'cap'; capValue?: number; ruleTitle?: string }> {
    const results: Record<string, { action: 'suppress' | 'cap'; capValue?: number; ruleTitle?: string }> = {};

    CONTEXT_RULES.forEach(rule => {
        const mainName = rule.mainBiomarkerName;

        // Missing data is now treated as rank 3 in currentRanks by the caller (calculateTierRank)
        // If the evaluate logic needs to check for presence, we could pass that info,
        // but the user says "if any not available save this data as locally (3 point)".

        const result = rule.evaluate(currentRanks);
        if (result.action !== 'none') {
            results[mainName] = {
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
 */
export function applyCappingRules(
    currentRanks: Record<string, number | null>
): Record<string, { action: 'suppress' | 'cap'; capValue?: number; ruleTitle?: string }> {
    const results: Record<string, { action: 'suppress' | 'cap'; capValue?: number; ruleTitle?: string }> = {};

    CAPPING_RULES.forEach(rule => {
        const mainName = rule.mainBiomarkerName;

        const result = rule.evaluate(currentRanks);
        if (result.action !== 'none') {
            results[mainName] = {
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
 * 
 * @param cappedRank - The final rank after applying context and capping rules
 * @param maxRank - The maximum possible rank (typically 5)
 * @param targetScore - The target score from TIER_DATA (e.g., 60 for HbA1c)
 * @returns The calculated final score (rounded to nearest integer)
 */
export function calculateFinalScore(
    cappedRank: number,
    maxRank: number,
    targetScore: number
): number {
    if (maxRank === 0) return 0;
    return Math.round((cappedRank / maxRank) * targetScore);
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
}

/**
 * Calculate original tier totals from TIER_DATA.
 * This represents the maximum achievable score for each tier.
 * 
 * @returns Object with tier totals { A, B, C }
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
 * Formula: (finalAchievedScore / finalTierTotalScore) × originalTierTotalScore
 * 
 * @param finalAchievedScore - Sum of calculated final scores
 * @param finalTierTotalScore - Sum of target scores for available markers
 * @param originalTierTotalScore - Original tier total from TIER_DATA
 * @returns Normalized score
 */
export function normalizeTierScore(
    finalAchievedScore: number,
    finalTierTotalScore: number,
    originalTierTotalScore: number
): number {
    // Handle edge case: no available markers in tier
    if (finalTierTotalScore === 0) return 0;

    return Math.round((finalAchievedScore / finalTierTotalScore) * originalTierTotalScore);
}

export interface BaselineCappingResult {
    lowestCap: number | null;
    appliedRules: { biomarkerName: string; rank: number; capScore: number }[];
}

/**
 * Calculates the overall baseline score cap based on various biomarkers.
 * Returns the lowest applicable cap score and the reasons.
 */
export function getBaselineCappingResult(bloodData: BloodBiomarker[], tierData: TieredBiomarker[]): BaselineCappingResult {
    let lowestCap: number | null = null;
    const appliedRules: { biomarkerName: string; rank: number; capScore: number }[] = [];

    BASELINE_CAPPING_RULES.forEach(rule => {
        let rank: number | null = null;

        // 1. Check if it's a tiered biomarker to handle complex rules (like Body Fat % substitution)
        const tieredItem = tierData.find(item => item.name === rule.biomarkerName);
        if (tieredItem) {
            rank = calculateTierRank(tieredItem, bloodData);
        } else {
            // 2. Otherwise look it up directly in bloodData
            const biomarker = bloodData.find(bm => bm.display_name === rule.biomarkerName);
            if (biomarker) {
                rank = getRatingRank(biomarker);
            }
        }

        if (rank !== null) {
            const applicableCap = rule.caps.find(c => c.rank === rank);
            if (applicableCap) {
                if (lowestCap === null || applicableCap.capScore < lowestCap) {
                    lowestCap = applicableCap.capScore;
                }
                appliedRules.push({
                    biomarkerName: rule.biomarkerName,
                    rank: rank,
                    capScore: applicableCap.capScore
                });
            }
        }
    });

    return { lowestCap, appliedRules };
}
