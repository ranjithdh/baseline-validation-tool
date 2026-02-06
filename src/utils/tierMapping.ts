import { TIER_DATA } from '../data/tierData';
import type { TieredBiomarker } from '../data/tierData';

/**
 * Find a tiered biomarker by its name
 * @param name - The biomarker name to search for (e.g., "HbA1c")
 * @param exactMatch - If true, requires exact match. If false, does case-insensitive partial match
 * @returns The TieredBiomarker object if found, undefined otherwise
 */
export function getTieredBiomarkerByName(name: string, exactMatch: boolean = true): TieredBiomarker | undefined {
    if (exactMatch) {
        // Direct match with primary name or any related names
        return TIER_DATA.find(item =>
            item.name === name ||
            (item.relatedNames && item.relatedNames.includes(name))
        );
    } else {
        const searchName = name.toLowerCase();
        return TIER_DATA.find(item =>
            item.name.toLowerCase().includes(searchName) ||
            (item.relatedNames && item.relatedNames.some(rn => rn.toLowerCase().includes(searchName)))
        );
    }
}

/**
 * Get all biomarkers for a specific tier
 * @param tier - The tier to filter by ("A", "B", or "C")
 * @returns Array of TieredBiomarker objects in the specified tier
 */
export function getBiomarkersByTier(tier: 'A' | 'B' | 'C'): TieredBiomarker[] {
    return TIER_DATA.filter(item => item.tier === tier);
}

/**
 * Get the tier for a specific biomarker name
 * @param name - The biomarker name to look up
 * @returns The tier ("A", "B", or "C") if found, undefined otherwise
 */
export function getTierByName(name: string): string | undefined {
    const biomarker = getTieredBiomarkerByName(name);
    return biomarker?.tier;
}

/**
 * Check if a biomarker name belongs to a tiered biomarker
 * @param name - The biomarker name to check
 * @returns True if the name is in TIER_DATA, false otherwise
 */
export function isTieredBiomarker(name: string): boolean {
    return getTieredBiomarkerByName(name) !== undefined;
}

/**
 * Get all tiered biomarker names from TIER_DATA
 * @returns Array of all primary names across all tiers
 */
export function getAllTieredNames(): string[] {
    return TIER_DATA.map(item => item.name);
}
