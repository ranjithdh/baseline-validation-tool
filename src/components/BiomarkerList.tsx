import { useState, useMemo } from 'react';
import type { BloodBiomarker, HealthDataResponse } from '../services/api';
import { getRatingRank, calculateTierRank, applyContextRules, applyCappingRules, calculateFinalScore, getBaselineCappingResult, calculateMaxTierRank, calculateOriginalTierTotals, normalizeTierScore, type BaselineScoreResult, type TierTotals, type TierScores, type BiomarkerAudit } from '../utils/scoreCalculator';
import { TIER_DATA } from '../data/tierData';
import { CalculationAudit } from './CalculationAudit';

const RatingBadge = ({ rating, score, rank, isCapped }: { rating: string; score?: number; rank?: number | null; isCapped?: boolean }) => {
    const getRatingColor = (r: string) => {
        switch (r.toLowerCase()) {
            case 'optimal': return '#00ff00';
            case 'normal': return '#0070f3';
            case 'monitor': return '#ffa500';
            case 'high':
            case 'borderline high':
            case 'needs attention': return '#ff0000';
            default: return 'var(--text-secondary)';
        }
    };

    return (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: `1px solid ${getRatingColor(rating)}`,
                color: getRatingColor(rating),
                textTransform: 'uppercase',
                fontWeight: 'bold'
            }}>
                {rating}
            </span>
            {rank !== undefined && rank !== null && (
                <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: isCapped ? 'rgba(255, 0, 0, 0.2)' : 'rgba(255, 165, 0, 0.2)',
                    color: isCapped ? '#ff4d4d' : '#ffa500',
                    border: `1px solid ${isCapped ? '#ff4d4d' : '#ffa500'}`,
                    fontWeight: 'bold'
                }}>
                    RANK: {rank} {isCapped && '(CAPPED)'}
                </span>
            )}
            {score !== undefined && (
                <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(0, 112, 243, 0.2)',
                    color: '#0070f3',
                    border: '1px solid #0070f3',
                    fontWeight: 'bold'
                }}>
                    TARGET: {score}
                </span>
            )}
        </div>
    );
};

interface BiomarkerListProps {
    healthData: HealthDataResponse | null;
    loading: boolean;
    error: string | null;
    bmi?: number | null;
}

const BiomarkerList = ({ healthData, loading, error, bmi }: BiomarkerListProps) => {
    // Internal state moved to props
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'tiered' | 'finalized' | 'audit'>('all');

    // useEffect removed - Data fetching is now handled by parent component

    const categorizedData = useMemo(() => {
        if (!healthData?.data?.blood?.data) return {};

        const bloodData = healthData.data.blood.data;
        const groups: { [key: string]: any[] } = {};

        if (activeTab === 'all') {
            bloodData.forEach(biomarker => {
                const group = biomarker.group_name || 'Other';
                if (!groups[group]) groups[group] = [];

                if (
                    biomarker.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    group.toLowerCase().includes(searchTerm.toLowerCase())
                ) {
                    groups[group].push(biomarker);
                }
            });
        } else if (activeTab === 'tiered' || activeTab === 'finalized' || activeTab === 'audit') {
            // Tiered & Finalized Logic: Iterate through TIER_DATA (Single Source of Truth)
            ['Tier A', 'Tier B', 'Tier C', 'Other'].forEach(t => groups[t] = []);

            // 1. Calculate Initial Ranks (mapped by display name)
            const initialRanks: Record<string, number | null> = {};

            // Initialize all tiered biomarkers to 3 (Locally Saved fallback)
            // Note: In finalized tab, we only care about API data (Denominator Reduction)
            TIER_DATA.forEach(item => {
                initialRanks[item.name] = 3;
                if (item.relatedNames) {
                    item.relatedNames.forEach(rn => initialRanks[rn] = 3);
                }
            });

            // Map all API biomarkers to their ranks by display name
            bloodData.forEach(bm => {
                initialRanks[bm.display_name] = getRatingRank(bm);
            });

            // 2. Apply Marker Context/Capping Rules - ONLY for processing tabs
            const showProcessed = activeTab === 'finalized' || activeTab === 'audit';
            const contextActions = showProcessed ? applyContextRules(initialRanks) : {};
            const cappingActions = showProcessed ? applyCappingRules(initialRanks) : {};
            const allActions = { ...contextActions, ...cappingActions };

            TIER_DATA.forEach(tierItem => {
                const action = allActions[tierItem.name];

                // SUPPRESSION: Remove from output - ONLY for Finalized tab
                if (showProcessed && action?.action === 'suppress') return;

                let { rank } = calculateTierRank(tierItem, bloodData, bmi);

                // If missing from API and in processing tabs, skip completely (Denominator Reduction)
                if (showProcessed && rank === null) return;

                let isCapped = false;

                // CAPPING: Limit the rank - ONLY for processing tabs
                if (showProcessed && action?.action === 'cap' && action.capValue !== undefined && rank !== null) {
                    if (rank > action.capValue) {
                        rank = action.capValue;
                        isCapped = true;
                    }
                }

                // Calculate final score based on capped rank
                const finalScore = (showProcessed && rank !== null)
                    ? calculateFinalScore(rank, calculateMaxTierRank(tierItem, bloodData), tierItem.targetScore)
                    : null;

                // Find primary or first representative biomarker for display purposes
                const namesToSearch = [tierItem.name, ...(tierItem.relatedNames || [])];
                let representative: BloodBiomarker | undefined;
                let foundInApi = false;

                for (const name of namesToSearch) {
                    const bm = bloodData.find(b => b.display_name === name);
                    if (bm) {
                        representative = bm;
                        foundInApi = true;
                        break;
                    }
                }

                const group = `Tier ${tierItem.tier}`;

                if (
                    tierItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (representative?.display_name || '').toLowerCase().includes(searchTerm.toLowerCase())
                ) {
                    groups[group].push({
                        ...representative,
                        id: representative?.id || tierItem.name,
                        display_name: tierItem.name,
                        tierInfo: tierItem,
                        calculatedRank: rank,
                        isCapped: isCapped,
                        appliedRule: action?.ruleTitle,
                        finalScore: finalScore,
                        maxRank: calculateMaxTierRank(tierItem, bloodData),
                        isUnavailable: !foundInApi,
                    });
                }
            });
        }

        return groups;
    }, [healthData, searchTerm, activeTab, bmi]);

    const totalCount = useMemo(() => {
        return Object.values(categorizedData).reduce((acc, curr) => acc + curr.length, 0);
    }, [categorizedData]);

    const baselineScore = useMemo((): BaselineScoreResult | null => {
        if ((activeTab !== 'finalized' && activeTab !== 'audit') || !healthData?.data?.blood?.data) return null;

        const bloodData = healthData.data.blood.data;

        // 1. Calculate Ranks & Populate Map
        const currentRanks: Record<string, number | null> = {};
        TIER_DATA.forEach(tierItem => {
            const { rank } = calculateTierRank(tierItem, bloodData, bmi);
            if (tierItem.metric_id) {
                currentRanks[tierItem.metric_id] = rank;
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
                if (capVal !== undefined && cappedRank !== null && cappedRank > capVal) { // 5 (Best) > 3 (Cap) -> Reset to 3 (Cap)
                    cappedRank = capVal;
                    ruleApplied = (ruleApplied ? ruleApplied + ' + ' : '') + 'cap';
                    ruleTitle = contextAction.ruleTitle;
                }
            }

            // Priority 2: Capping Rules
            if (cappingAction?.action === 'cap') {
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
            // Only calculate score if not suppressed (cappedRank != null) AND not missing (rank != null)
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
                substituteValue: audit.substituteValue
            };
            markerAudits.push(finalAudit);

            // Accumulate Tier Scores
            // Only add if we have a valid result (not missing/suppressed)?
            // "Biomarkers are NOT suppressed if they are simply missing..." -> Missing means rank is null.
            // If rank is null, cappedRank is null.
            // But verify: calculateTierRank returns null if missing.
            // So if missing, finalScore is 0.
            // But effectively, missing data *should* penalize score by being 0 achieved out of Target Total.
            // So we ALWAYS add to Total.
            // But only add to Acheived if we have a score.

            const tier = item.tier as 'A' | 'B' | 'C';
            if (cappedRank !== null) {
                if (import.meta.env.MODE === 'development') {
                    console.log(`DebugItem: ${item.name} | Tier: ${tier} | Target: ${item.targetScore} | Current A Total: ${finalizedScores.A.total}`);
                }
                finalizedScores[tier].achieved += finalScore;
                finalizedScores[tier].total += item.targetScore;
            }
            // Always add to total? Or only if available?
            // The tier system usually counts available markers.
            // "Normalize a tier score to the original tier total."
            // This implies we calculate based on *available* markers?
            // normalizeTierScore formula: (Achieved / FinalTierTotal) * OriginalTierTotal.
            // FinalTierTotal = Sum of targets for AVAILABLE markers.


        });

        if (import.meta.env.MODE === 'development') {
            const missing = markerAudits.filter(a => a.isMissing).map(a => a.name);
            const suppressed = markerAudits.filter(a => !a.isMissing && a.ruleApplied?.includes('suppress')).map(a => a.name);
            console.warn('Configuration Audit:', {
                missingCount: missing.length,
                missingBiomarkers: missing,
                suppressedCount: suppressed.length,
                suppressedBiomarkers: suppressed,
                finalizedScores
            });
        }

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
    }, [healthData, activeTab, bmi]);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px', color: 'var(--text-secondary)' }}>
            <div className="glass-card" style={{ padding: '20px 40px' }}>
                <p style={{ margin: 0 }}>Fetching real-time biomarker data...</p>
            </div>
        </div>
    );

    if (error) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
            <div className="glass-card" style={{ padding: '20px 40px', border: '1px solid rgba(255,0,0,0.3)' }}>
                <p style={{ margin: 0, color: '#ff4d4d' }}>Error: {error}</p>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        marginTop: '15px',
                        padding: '8px 16px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: 'white',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Retry Fetch
                </button>
            </div>
        </div>
    );

    return (
        <div className="biomarker-explorer">
            <header className="biomarker-header" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>
                            {activeTab === 'all' ? 'Staging API Biomarkers' : activeTab === 'tiered' ? 'Tiered Blood Biomarkers' : activeTab === 'finalized' ? 'Finalized Biomarker Scores' : 'Calculation Audit'}
                        </h1>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {activeTab === 'all' ? `Showing all ${totalCount} biomarkers.` : activeTab === 'tiered' ? `Showing ${totalCount} tiered biomarkers.` : activeTab === 'finalized' ? `Showing ${totalCount} finalized scores.` : 'Detailed scoring audit trail.'}
                        </p>
                    </div>

                    <div className="tab-navigation" style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                        {(['all', 'audit'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    padding: '8px 16px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    background: activeTab === tab ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    color: activeTab === tab ? 'white' : 'var(--text-secondary)',
                                    transition: 'all 0.2s',
                                    textTransform: 'capitalize'
                                }}
                            >
                                {tab === 'audit' ? 'Calculation Audit' : tab}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Search biomarkers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            background: 'var(--surface-color)',
                            border: '1px solid var(--border-color)',
                            color: 'white',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            fontSize: '0.95rem'
                        }}
                    />
                </div>
            </header>

            <main>
                {activeTab === 'audit' && baselineScore ? (
                    <CalculationAudit baselineScore={baselineScore} />
                ) : (
                    <>
                        {activeTab === 'finalized' && baselineScore && (
                            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                                <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem' }}>Baseline Score Summary</h2>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                                    {(['A', 'B', 'C'] as const).map(tier => (
                                        <div key={tier} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Tier {tier}</div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>
                                                {baselineScore.normalizedScores[tier].toFixed(2)} / {baselineScore.originalTotals[tier]}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{
                                    padding: '1.5rem',
                                    borderRadius: '12px',
                                    textAlign: 'center',
                                    background: baselineScore.isCappedOverall ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                    border: `2px solid ${baselineScore.isCappedOverall ? '#ef4444' : '#10b981'}`
                                }}>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Final Baseline Score</div>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: baselineScore.isCappedOverall ? '#ef4444' : '#10b981' }}>
                                        {((baselineScore.totalBaselineScore / baselineScore.totalOriginalScore) * 100).toFixed(1)} / 100
                                    </div>
                                    {baselineScore.isCappedOverall && (
                                        <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 'bold', marginTop: '0.5rem' }}>
                                            Capped to {baselineScore.cappingResult.lowestCap}% by dashboard rules
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'grid', gap: '2.5rem' }}>
                            {Object.entries(categorizedData).map(([group, biomarkers]) => (
                                biomarkers.length > 0 && (
                                    <section key={group}>
                                        <h2 style={{ fontSize: '1.25rem', color: '#10b981', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                            {group}
                                        </h2>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                                            {biomarkers.map((bm, idx) => (
                                                <div key={idx} className="glass-card" style={{ padding: '1.25rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                                        <div>
                                                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>{bm.display_name}</h3>
                                                            {bm.isUnavailable && <div style={{ fontSize: '0.7rem', color: '#60a5fa' }}>Locally Saved Fallback</div>}
                                                        </div>
                                                        <RatingBadge
                                                            rating={bm.display_rating || 'N/A'}
                                                            score={bm.tierInfo?.targetScore}
                                                            rank={bm.calculatedRank}
                                                            isCapped={bm.isCapped}
                                                        />
                                                    </div>

                                                    {!bm.isUnavailable ? (
                                                        <div style={{ marginBottom: '1rem' }}>
                                                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                                                                {bm.value} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>{bm.unit}</span>
                                                            </div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Range: {bm.range}</div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px dashed var(--border-color)', fontSize: '0.75rem', textAlign: 'center' }}>
                                                            Data Missing from API
                                                        </div>
                                                    )}

                                                    {(activeTab === 'finalized' || activeTab === 'audit') && bm.calculatedRank !== null && (
                                                        <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.75rem' }}>
                                                            <div style={{ fontWeight: 'bold', color: '#10b981', marginBottom: '0.25rem' }}>CALCULATION:</div>
                                                            <div>({bm.calculatedRank} / {bm.maxRank}) × {bm.tierInfo?.targetScore} = <strong>{bm.finalScore}</strong></div>
                                                            {bm.appliedRule && <div style={{ marginTop: '0.5rem', color: bm.isCapped ? '#f59e0b' : '#ef4444', fontStyle: 'italic' }}>Rule: {bm.appliedRule}</div>}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )
                            ))}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default BiomarkerList;
