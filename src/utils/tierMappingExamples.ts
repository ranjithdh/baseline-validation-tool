/**
 * Tier Mapping Utility Functions - Usage Examples
 * 
 * This file demonstrates how to use the tier mapping functions
 */

import {
    getTieredBiomarkerByName,
    getBiomarkersByTier,
    getTierByName,
    isTieredBiomarker,
    getAllTieredNames
} from './tierMapping';

// Example 1: Find biomarker by name (exact match)
const hba1c = getTieredBiomarkerByName('Haemoglobin A1C (HbA1C)');
console.log('HbA1c by name:', hba1c);
// Output: { name: "Haemoglobin A1C (HbA1C)", tier: "A", targetScore: 60 }

// Example 2: Find biomarker by related name
const insulinPP = getTieredBiomarkerByName('Postprandial (PP) Insulin');
console.log('Insulin by related name:', insulinPP);
// Output: { name: "Insulin", tier: "A", targetScore: 60, relatedNames: ["Fasting Insulin", "Postprandial (PP) Insulin"], rule: 'lowest' }

// Example 3: Find biomarker by name (partial match)
const vitamin = getTieredBiomarkerByName('Vitamin D', false);
console.log('Vitamin D (partial match):', vitamin);
// Output: { name: "Vitamin D", tier: "A", targetScore: 40 }

// Example 4: Get all biomarkers in Tier A
const tierABiomarkers = getBiomarkersByTier('A');
console.log('Tier A biomarkers count:', tierABiomarkers.length);
// Output: 13 biomarkers

// Example 5: Get tier by name
const tierByName = getTierByName('Magnesium');
console.log('Tier for Magnesium:', tierByName);
// Output: "C"

// Example 6: Check if a biomarker name is tiered
const isHbA1cTiered = isTieredBiomarker('Haemoglobin A1C (HbA1C)');
console.log('Is HbA1C tiered?', isHbA1cTiered);
// Output: true

// Example 7: Get all tiered biomarker names
const allNames = getAllTieredNames();
console.log('Total tiered biomarkers:', allNames.length);
console.log('First 5 biomarker names:', allNames.slice(0, 5));
