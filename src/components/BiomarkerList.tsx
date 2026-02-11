import { useState, useMemo } from 'react';
import type { BloodBiomarker, HealthDataResponse } from '../services/api';
import { getRatingRank, calculateTierRank, applyContextRules, applyCappingRules, calculateFinalScore, getBaselineCappingResult, calculateMaxTierRank, calculateOriginalTierTotals, normalizeTierScore, type BaselineScoreResult, type TierTotals, type TierScores, type BiomarkerAudit } from '../utils/scoreCalculator';
import { TIER_DATA } from '../data/tierData';
import { CalculationAudit } from './CalculationAudit';

const RatingBadge = ({ rating, rank, isCapped }: { rating: string; rank?: number | null; isCapped?: boolean }) => {
    const getRatingInfo = (r: string) => {
        switch (r.toLowerCase()) {
            case 'optimal': return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
            case 'normal': return { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' };
            case 'monitor': return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
            case 'high':
            case 'borderline high':
            case 'needs attention': return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
            default: return { color: 'var(--text-muted)', bg: 'rgba(255, 255, 255, 0.05)' };
        }
    };

    const info = getRatingInfo(rating);

    return (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: info.bg,
                border: `1px solid ${info.color}33`,
                color: info.color,
                textTransform: 'uppercase',
                fontWeight: 700,
                letterSpacing: '0.02em'
            }}>
                {rating}
            </span>
            {rank !== undefined && rank !== null && (
                <span style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: isCapped ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                    color: isCapped ? '#f87171' : '#818cf8',
                    border: `1px solid ${isCapped ? '#ef444455' : '#6366f155'}`,
                    fontWeight: 700
                }}>
                    RANK: {rank}
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

        // First, populate ranks for ALL available blood data directly
        bloodData.forEach(bm => {
            if (bm.metric_id) {
                const rank = getRatingRank(bm);
                currentRanks[bm.metric_id] = rank;
                if (import.meta.env.MODE === 'development') {
                    // console.log(`Populated Rank for ${bm.display_name} (${bm.metric_id}): ${rank}`);
                }
            }
        });

        // Then, ensure tiered items are also captured (redundant but safe for calculated fields)
        TIER_DATA.forEach(tierItem => {
            const { rank } = calculateTierRank(tierItem, bloodData, bmi);
            if (tierItem.metric_id) {
                // If it's already there from bloodData, this might be a calculated rank (e.g. combined), so we might want to overwrite or prioritize?
                // Context rules usually expect the "raw" rank of the biomarker.
                // But calculateTierRank handles logic like "lowest of A and B".
                // For context rules, we typically want the specific biomarker's rank.
                // So bloodData loop above is better for raw inputs.
                // tierItem loop is good for the "Main" rank used for scoring.

                // Let's keep the tier rank as the "official" rank for that ID if it exists, 
                // but the loop above ensures we have ranks for things that AREN'T main tier items (like constituent parts).
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
                if (capVal !== undefined && cappedRank !== null && cappedRank > capVal) { // 5 (Best) > 3 (Cap) -> Reset to 3 (Cap)
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
            <header style={{ marginBottom: 'var(--space-2xl)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
                            {activeTab === 'all' ? 'Staging API Biomarkers' : activeTab === 'audit' ? 'Validation Audit Trail' : 'Tiered Insights'}
                        </h1>
                        <p className="text-secondary" style={{ fontSize: '0.95rem' }}>
                            {activeTab === 'all' ? `Analyzing ${totalCount} metrics from staging.` : activeTab === 'audit' ? 'In-depth diagnostic trace of all calculation phases.' : 'Grouped analysis of priority biomarkers.'}
                        </p>
                    </div>

                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        background: 'rgba(255,255,255,0.03)',
                        padding: '4px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)'
                    }}>
                        {(['all', 'audit'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    padding: '10px 20px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    background: activeTab === tab ? 'var(--bg-surface)' : 'transparent',
                                    color: activeTab === tab ? 'white' : 'var(--text-muted)',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    transition: 'all 0.2s ease',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    boxShadow: activeTab === tab ? 'var(--shadow-md)' : 'none'
                                }}
                            >
                                {tab === 'audit' ? 'Trace Audit' : tab}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ position: 'relative', maxWidth: '600px' }}>
                    <input
                        type="text"
                        placeholder="Quick filter metrics..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            color: 'white',
                            padding: '0.875rem 1rem',
                            borderRadius: '12px',
                            fontSize: '0.9rem',
                            outline: 'none',
                            transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                    />
                </div>
            </header>

            <main>
                {activeTab === 'audit' && baselineScore ? (
                    <CalculationAudit baselineScore={baselineScore} />
                ) : (
                    <>
                        {activeTab === 'finalized' && baselineScore && (
                            <div className="card" style={{
                                padding: 'var(--space-xl)',
                                marginBottom: 'var(--space-xl)',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-xl)' }}>
                                    <div>
                                        <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-xs)' }}>Baseline Score Summary</h2>
                                        <p className="text-secondary">Normalized results across tiered biomarker groups.</p>
                                    </div>
                                    <div style={{
                                        textAlign: 'center',
                                        padding: 'var(--space-md) var(--space-xl)',
                                        borderRadius: '20px',
                                        background: baselineScore.isCappedOverall ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                        border: `2px solid ${baselineScore.isCappedOverall ? 'var(--error)' : 'var(--primary)'}`
                                    }}>
                                        <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Final Aggregate</div>
                                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: baselineScore.isCappedOverall ? 'var(--error)' : 'var(--primary)' }}>
                                            {((baselineScore.totalBaselineScore / baselineScore.totalOriginalScore) * 100).toFixed(2)}

                                        </div>
                                        {baselineScore.isCappedOverall && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--error)', fontWeight: 700, marginTop: '4px' }}>
                                                Capped to {baselineScore.cappingResult.lowestCap}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-md)' }}>
                                    {(['A', 'B', 'C'] as const).map(tier => (
                                        <div key={tier} className="glass" style={{ padding: 'var(--space-lg)', borderRadius: '16px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                                                <div className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 700 }}>TIER {tier}</div>
                                                <div style={{
                                                    fontSize: '0.7rem',
                                                    padding: '2px 8px',
                                                    borderRadius: '20px',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid var(--border)'
                                                }}>
                                                    {baselineScore.finalizedScores[tier].total} Pts Total
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                                                {baselineScore.normalizedScores[tier].toFixed(2)}
                                                <span className="text-muted" style={{ fontSize: '1rem', fontWeight: 400 }}> / {baselineScore.originalTotals[tier]}</span>
                                            </div>
                                            <div style={{
                                                marginTop: 'var(--space-md)',
                                                height: '6px',
                                                background: 'rgba(255,255,255,0.05)',
                                                borderRadius: '3px',
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${(baselineScore.normalizedScores[tier] / baselineScore.originalTotals[tier]) * 100}%`,
                                                    background: 'var(--primary)',
                                                    boxShadow: '0 0 10px var(--primary)'
                                                }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'grid', gap: '2.5rem' }}>
                            {Object.entries(categorizedData).map(([group, biomarkers]) => (
                                biomarkers.length > 0 && (
                                    <section key={group}>
                                        <h2 style={{
                                            fontSize: '1rem',
                                            color: 'var(--primary)',
                                            marginBottom: 'var(--space-md)',
                                            paddingBottom: 'var(--space-xs)',
                                            borderBottom: '2px solid rgba(16, 185, 129, 0.1)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}>
                                            {group}
                                        </h2>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
                                            {biomarkers.map((bm, idx) => (
                                                <div key={idx} className="card card-interactive" style={{ padding: 'var(--space-lg)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '2px' }}>{bm.display_name}</h3>
                                                            {bm.isUnavailable && <div style={{ fontSize: '0.65rem', color: 'var(--secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Fallback Data</div>}
                                                        </div>
                                                        <RatingBadge
                                                            rating={bm.display_rating || 'N/A'}
                                                            rank={bm.calculatedRank}
                                                            isCapped={bm.isCapped}
                                                        />
                                                    </div>

                                                    {!bm.isUnavailable ? (
                                                        <div style={{ marginBottom: 'var(--space-md)' }}>
                                                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                                                {bm.value} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>{bm.unit}</span>
                                                            </div>
                                                            <div style={{ fontSize: '0.75rem', marginTop: '4px' }} className="text-muted">
                                                                Expected Range: <span style={{ color: 'var(--text-secondary)' }}>{bm.range}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div style={{
                                                            marginBottom: 'var(--space-md)',
                                                            padding: '1rem',
                                                            background: 'rgba(255,255,255,0.02)',
                                                            borderRadius: '12px',
                                                            border: '1px dashed var(--border)',
                                                            fontSize: '0.75rem',
                                                            textAlign: 'center',
                                                            color: 'var(--text-muted)'
                                                        }}>
                                                            Metrics not returned by API
                                                        </div>
                                                    )}

                                                    {(activeTab === 'finalized' || activeTab === 'audit') && bm.calculatedRank !== null && (
                                                        <div style={{
                                                            padding: '0.75rem 1rem',
                                                            background: 'rgba(16, 185, 129, 0.05)',
                                                            borderRadius: '10px',
                                                            border: '1px solid rgba(16, 185, 129, 0.15)',
                                                            fontSize: '0.75rem'
                                                        }}>
                                                            <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Calculation</div>
                                                            <div style={{ color: 'var(--text-secondary)' }}>
                                                                Rank {bm.calculatedRank}/{bm.maxRank} × {bm.tierInfo?.targetScore} = <strong style={{ color: 'var(--text-primary)' }}>{bm.finalScore}</strong>
                                                            </div>
                                                            {bm.appliedRule && (
                                                                <div style={{
                                                                    marginTop: 'var(--space-sm)',
                                                                    paddingTop: 'var(--space-sm)',
                                                                    borderTop: '1px solid rgba(255,255,255,0.05)',
                                                                    color: bm.isCapped ? 'var(--warning)' : 'var(--error)',
                                                                    fontStyle: 'italic',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                }}>
                                                                    <span>⚠️</span> {bm.appliedRule}
                                                                </div>
                                                            )}
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
