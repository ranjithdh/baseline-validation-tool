import { TIER_DATA } from '../data/tierData';
import type { TieredBiomarker } from '../data/tierData';

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function findTierInfo(biomarkerName: string): TieredBiomarker | undefined {
    // 1. Primary Match: Using Metric ID
    // NOTE: metricIds property doesn't exist in TieredBiomarker interface
    // This code is commented out until the interface is updated
    /*
    if (metricId) {
        const idMatch = TIER_DATA.find(item => {
            if (!item.metricIds) return false;
            if (Array.isArray(item.metricIds)) {
                return item.metricIds.includes(metricId);
            }
            return item.metricIds === metricId;
        });
        if (idMatch) return idMatch;
    }
    */

    // 2. Fallback Match: Using Name (Direct or Partial)
    const normalizedSearch = normalize(biomarkerName);

    // Direct match
    const directMatch = TIER_DATA.find(item => normalize(item.name) === normalizedSearch);
    if (directMatch) return directMatch;

    // Partial match
    return TIER_DATA.find(item => {
        const normalizedItem = normalize(item.name);
        return (normalizedSearch.includes(normalizedItem) || normalizedItem.includes(normalizedSearch)) && normalizedItem.length >= 3;
    });
}
