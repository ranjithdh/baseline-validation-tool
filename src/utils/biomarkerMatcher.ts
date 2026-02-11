import { TIER_DATA } from '../data/tierData';
import type { TieredBiomarker } from '../data/tierData';

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function findTierInfo(biomarkerName: string, metricId?: string): TieredBiomarker | undefined {
    // 1. Primary Match: Using Metric ID
    if (metricId) {
        const idMatch = TIER_DATA.find(item => item.metric_id === metricId || (item.relatedMetricIds && item.relatedMetricIds.includes(metricId)));
        if (idMatch) return idMatch;
    }

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
