import { useEffect, useState, useMemo } from 'react';
import { fetchHealthData } from '../services/api';
import type { BloodBiomarker, HealthDataResponse } from '../services/api';
import { getRatingRank, calculateTierRank, applyContextRules, applyCappingRules, calculateFinalScore, getBaselineCappingResult, type BaselineScoreResult, type TierTotals, type TierScores, type BaselineCappingResult } from '../utils/scoreCalculator';
import { TIER_DATA } from '../data/tierData';

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

const BiomarkerList = () => {
    const [data, setData] = useState<HealthDataResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'tiered' | 'finalized'>('all');

    useEffect(() => {
        const getData = async () => {
            try {
                setLoading(true);
                const result = await fetchHealthData();
                setData(result);
                setError(null);
            } catch (err: any) {
                console.error('API fetch failed:', err);
                setError(err.message || 'An error occurred while fetching real-time data');
            } finally {
                setLoading(false);
            }
        };

        getData();
    }, []);

    const categorizedData = useMemo(() => {
        if (!data?.data?.blood?.data) return {};

        const bloodData = data.data.blood.data;
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
        } else if (activeTab === 'tiered' || activeTab === 'finalized') {
            // Tiered & Finalized Logic: Iterate through TIER_DATA (Single Source of Truth)
            ['Tier A', 'Tier B', 'Tier C', 'Other'].forEach(t => groups[t] = []);

            // 1. Calculate Initial Ranks (mapped by display name)
            const initialRanks: Record<string, number | null> = {};

            // Initialize all tiered biomarkers to 3 (Locally Saved)
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

            // 2. Apply Marker Context Rules (Suppression/Capping) - ONLY for Finalized tab
            const contextActions = activeTab === 'finalized' ? applyContextRules(initialRanks) : {};

            // 3. Apply Marker Capping Rules (Secondary Metric capping based on Primary Metric) - ONLY for Finalized tab
            const cappingActions = activeTab === 'finalized' ? applyCappingRules(initialRanks) : {};

            // 4. Merge both rule sets (capping rules take precedence if both apply)
            const allActions = { ...contextActions, ...cappingActions };

            TIER_DATA.forEach(tierItem => {
                const action = allActions[tierItem.name];

                // SUPPRESSION: Remove from output - ONLY for Finalized tab
                if (activeTab === 'finalized' && action?.action === 'suppress') return;

                let rank = calculateTierRank(tierItem, bloodData);

                // If missing from API and in Finalized tab, skip completely
                if (activeTab === 'finalized' && rank === null) return;

                let isCapped = false;

                // CAPPING: Limit the rank - ONLY for Finalized tab
                if (activeTab === 'finalized' && action?.action === 'cap' && action.capValue !== undefined && rank !== null) {
                    if (rank > action.capValue) {
                        rank = action.capValue;
                        isCapped = true;
                    }
                }

                // Calculate final score based on capped rank - ONLY for Finalized tab
                const finalScore = (activeTab === 'finalized' && rank !== null)
                    ? calculateFinalScore(rank, 5, tierItem.targetScore)
                    : null;

                // Find primary or first representative biomarker for display purposes
                // Look for primary name first, then relatedNames
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

                // ALWAYS show all TIER_DATA biomarkers (even if unavailable in API)
                const group = `Tier ${tierItem.tier}`;

                if (
                    tierItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (representative?.display_name || '').toLowerCase().includes(searchTerm.toLowerCase())
                ) {
                    groups[group].push({
                        ...representative,
                        id: representative?.id || tierItem.name,
                        display_name: tierItem.name, // Use the name from tierData
                        tierInfo: tierItem,
                        calculatedRank: rank,
                        isCapped: isCapped,
                        appliedRule: action?.ruleTitle, // Store the triggered rule title
                        finalScore: finalScore,
                        maxRank: 5,
                        isUnavailable: !foundInApi, // Flag for locally saved data
                    });
                }
            });
        }

        return groups;
    }, [data, searchTerm, activeTab]);

    const totalCount = useMemo(() => {
        return Object.values(categorizedData).reduce((acc, curr) => acc + curr.length, 0);
    }, [categorizedData]);

    // Calculate Baseline Score with Tier Normalization (only for finalized tab)
    const baselineScore = useMemo((): BaselineScoreResult | null => {
        if (activeTab !== 'finalized' || !data?.data?.blood?.data) return null;

        const bloodData = data.data.blood.data;

        // REMOVED: Static original totals (no longer used for normalization)

        // Step 2: Calculate finalized tier totals and achieved scores
        const finalizedScores: TierScores = {
            A: { total: 0, achieved: 0 },
            B: { total: 0, achieved: 0 },
            C: { total: 0, achieved: 0 }
        };

        // Calculate initial ranks (mapped by display name)
        const initialRanks: Record<string, number | null> = {};

        // REMOVED: No more initializing all tiered biomarkers to 3
        // Missing biomarkers remain null in initialRanks

        bloodData.forEach(bm => {
            initialRanks[bm.display_name] = getRatingRank(bm);
        });

        // Apply rules
        const contextActions = applyContextRules(initialRanks);
        const cappingActions = applyCappingRules(initialRanks);
        const allActions = { ...contextActions, ...cappingActions };

        // Process each tier item
        TIER_DATA.forEach(tierItem => {
            const action = allActions[tierItem.name];

            // Only subtract from tier total if SUPPRESSED
            if (action?.action === 'suppress') return;

            // Otherwise, calculate score
            let rank = calculateTierRank(tierItem, bloodData);

            // MISSING from API: Skip calculation (Denominator Reduction)
            if (rank === null) return;

            if (action?.action === 'cap' && action.capValue !== undefined) {
                if (rank > action.capValue) {
                    rank = action.capValue;
                }
            }

            const finalScore = calculateFinalScore(rank, 5, tierItem.targetScore);
            const tier = tierItem.tier as 'A' | 'B' | 'C';

            finalizedScores[tier].achieved += finalScore;
            finalizedScores[tier].total += tierItem.targetScore;
        });

        // Step 3: Implement normalization to fixed original totals
        const originalTotals: TierTotals = {
            A: 600,
            B: 240,
            C: 160,
        };

        const normalizedScores: TierTotals = {
            A: finalizedScores.A.total > 0 ? (finalizedScores.A.achieved / finalizedScores.A.total) * originalTotals.A : 0,
            B: finalizedScores.B.total > 0 ? (finalizedScores.B.achieved / finalizedScores.B.total) * originalTotals.B : 0,
            C: finalizedScores.C.total > 0 ? (finalizedScores.C.achieved / finalizedScores.C.total) * originalTotals.C : 0,
        };

        // Step 4: Calculate total baseline scores
        const totalBaselineScore = normalizedScores.A + normalizedScores.B + normalizedScores.C;
        const totalOriginalScore = originalTotals.A + originalTotals.B + originalTotals.C;

        // Step 5: Calculate baseline score capping
        const cappingResult = getBaselineCappingResult(bloodData, TIER_DATA);

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
            preCappedScore: totalBaselineScore
        };
    }, [data, activeTab]);

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
                            {activeTab === 'all'
                                ? 'Staging API Biomarkers'
                                : activeTab === 'tiered'
                                    ? 'Tiered Blood Biomarkers'
                                    : 'Finalized Biomarker Scores'}
                        </h1>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {activeTab === 'all'
                                ? `Showing all ${totalCount} biomarkers from the live API.`
                                : activeTab === 'tiered'
                                    ? `Showing ${totalCount} biomarkers organized by Tier A, B, and C (original data before processing).`
                                    : `Showing ${totalCount} finalized biomarkers with all rules applied and scores calculated.`}
                        </p>
                    </div>

                    <div className="tab-navigation" style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                        <button
                            className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
                            onClick={() => setActiveTab('all')}
                            style={{
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                background: activeTab === 'all' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                color: activeTab === 'all' ? 'white' : 'var(--text-secondary)',
                                transition: 'all 0.2s'
                            }}
                        >
                            All Biomarkers
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'tiered' ? 'active' : ''}`}
                            onClick={() => setActiveTab('tiered')}
                            style={{
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                background: activeTab === 'tiered' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                color: activeTab === 'tiered' ? 'white' : 'var(--text-secondary)',
                                transition: 'all 0.2s'
                            }}
                        >
                            Tiered Mapping
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'finalized' ? 'active' : ''}`}
                            onClick={() => setActiveTab('finalized')}
                            style={{
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                background: activeTab === 'finalized' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                color: activeTab === 'finalized' ? 'white' : 'var(--text-secondary)',
                                transition: 'all 0.2s'
                            }}
                        >
                            Finalized Scores
                        </button>
                    </div>
                </div>

                <div className="search-bar">
                    <input
                        type="text"
                        placeholder={activeTab === 'all' ? "Search all biomarkers..." : "Search tiered biomarkers..."}
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

            {/* Baseline Score Summary - ONLY for Finalized Tab */}
            {activeTab === 'finalized' && baselineScore && (
                <div style={{ marginBottom: '2rem' }}>
                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                            Baseline Score Summary
                        </h2>

                        {/* Tier Breakdown */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                            {(['A', 'B', 'C'] as const).map(tier => {
                                const normalized = baselineScore.normalizedScores[tier];
                                const original = baselineScore.originalTotals[tier];
                                const finalized = baselineScore.finalizedScores[tier];

                                return (
                                    <div key={tier} style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)'
                                    }}>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                            Tier {tier}
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981', marginBottom: '0.5rem' }}>
                                            {normalized.toFixed(2)} / {original}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                            Available Points: {finalized.total}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Total Baseline Score */}
                        <div style={{
                            background: baselineScore.isCappedOverall
                                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(185, 28, 28, 0.1) 100%)'
                                : 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                            border: `2px solid ${baselineScore.isCappedOverall ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                            padding: '1.5rem',
                            borderRadius: '12px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                Total Baseline Score
                            </div>
                            <div style={{
                                fontSize: '2.5rem',
                                fontWeight: 'bold',
                                color: baselineScore.isCappedOverall ? '#ef4444' : '#10b981',
                                marginBottom: '0.25rem'
                            }}>
                                {Math.round((baselineScore.totalBaselineScore / baselineScore.totalOriginalScore) * 100)} / 100
                            </div>

                            {baselineScore.isCappedOverall && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Overall Score Capped to {baselineScore.cappingResult.lowestCap} / 100
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                        Original: {Math.round((baselineScore.preCappedScore / baselineScore.totalOriginalScore) * 100)} / 100
                                    </div>

                                    <div style={{
                                        marginTop: '12px',
                                        display: 'inline-flex',
                                        flexDirection: 'column',
                                        gap: '4px',
                                        textAlign: 'left',
                                        background: 'rgba(239, 68, 68, 0.05)',
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid rgba(239, 68, 68, 0.1)'
                                    }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Triggering Conditions:</span>
                                        {baselineScore.cappingResult.appliedRules
                                            .filter(rule => rule.capScore === baselineScore.cappingResult.lowestCap)
                                            .map((rule, idx) => (
                                                <div key={idx} style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                                    • {rule.biomarkerName} (Rank {rule.rank} → Cap {rule.capScore})
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                {baselineScore.totalBaselineScore.toFixed(2)} / {baselineScore.totalOriginalScore} points achieved
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gap: 'var(--spacing-xl)' }}>
                {Object.entries(categorizedData).map(([group, biomarkers]) => (
                    biomarkers.length > 0 && (
                        <section key={group}>
                            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                                {group}
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 'var(--spacing-md)' }}>
                                {biomarkers.map((bm, idx) => (
                                    <div key={bm.id || idx} className="glass-card" style={{ padding: 'var(--spacing-md)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                            <div style={{ flex: 1 }}>
                                                <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>{bm.display_name}</h4>

                                                {/* Visual Logic Badges */}
                                                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                                                    {bm.isUnavailable && (
                                                        <span style={{
                                                            fontSize: '10px',
                                                            padding: '2px 6px',
                                                            background: 'rgba(96, 165, 250, 0.1)',
                                                            color: '#60a5fa',
                                                            border: '1px solid rgba(96, 165, 250, 0.3)',
                                                            borderRadius: '4px',
                                                            fontWeight: '600'
                                                        }}>
                                                            Locally Saved (Default Rank 3)
                                                        </span>
                                                    )}
                                                    {activeTab === 'finalized' && bm.appliedRule && (
                                                        <span style={{
                                                            fontSize: '10px',
                                                            padding: '2px 6px',
                                                            background: bm.isCapped ? 'rgba(251, 191, 36, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                            color: bm.isCapped ? '#fbbf24' : '#ef4444',
                                                            border: `1px solid ${bm.isCapped ? 'rgba(251, 191, 36, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                                            borderRadius: '4px',
                                                            fontWeight: '600',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}>
                                                            {bm.isCapped ? '⚠️ Capped' : '🚫 Adjusted'}: {bm.appliedRule}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {!bm.isUnavailable && (
                                                <RatingBadge
                                                    rating={bm.display_rating || 'N/A'}
                                                    score={bm.tierInfo?.targetScore}
                                                    rank={bm.calculatedRank}
                                                    isCapped={bm.isCapped}
                                                />
                                            )}
                                        </div>

                                        {/* Show placeholder for unavailable data OR actual values */}
                                        {bm.isUnavailable ? (
                                            <div style={{
                                                padding: '12px',
                                                textAlign: 'center',
                                                background: 'rgba(255,255,255,0.02)',
                                                borderRadius: '8px',
                                                border: '1px dashed var(--border-color)',
                                                marginBottom: '12px'
                                            }}>
                                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                    - / 5
                                                </div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                                    API data missing - baseline placeholder
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ marginBottom: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>
                                                        {bm.value !== undefined ? bm.value : '--'}
                                                    </span>
                                                    <span className="text-secondary" style={{ fontSize: '12px' }}>{bm.unit || ''}</span>
                                                </div>

                                                <p className="text-secondary" style={{ fontSize: '11px', lineHeight: '1.4', margin: 0 }}>
                                                    Range: {bm.range || 'N/A'}
                                                </p>
                                            </div>
                                        )}

                                        {/* Display Detailed Score Breakdown - ONLY for Finalized Tab */}
                                        {activeTab === 'finalized' && bm.finalScore !== undefined && bm.finalScore !== null && (
                                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
                                                    Logic Applied & Score:
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                                    {/* Original Rank Source */}
                                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: '4px' }}>
                                                        <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                                                            {bm.isUnavailable ? 'Default Rank' : 'API Rank'}
                                                        </div>
                                                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#60a5fa' }}>
                                                            {bm.isUnavailable ? '3' : bm.maxRank}
                                                        </div>
                                                    </div>

                                                    {/* Final Rank */}
                                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: '4px' }}>
                                                        <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                                                            Final Rank
                                                        </div>
                                                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: bm.isCapped ? '#fbbf24' : '#10b981' }}>
                                                            {bm.calculatedRank}
                                                            {bm.isCapped && <span style={{ fontSize: '10px', marginLeft: '4px' }}>⚠️</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Formula Display */}
                                                <div style={{
                                                    background: 'rgba(16, 185, 129, 0.05)',
                                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                                    padding: '8px',
                                                    borderRadius: '6px'
                                                }}>
                                                    <div style={{ color: '#10b981', marginBottom: '4px', fontSize: '9px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        Calculation Formula
                                                    </div>
                                                    <div style={{ color: '#fff', fontSize: '11px', fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <span>
                                                            ({bm.calculatedRank} / 5) × {bm.tierInfo?.targetScore}
                                                        </span>
                                                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981' }}>
                                                            = {bm.finalScore}
                                                        </span>
                                                    </div>
                                                </div>

                                                {bm.appliedRule && (
                                                    <div style={{
                                                        marginTop: '8px',
                                                        fontSize: '10px',
                                                        color: bm.isCapped ? '#fbbf24' : '#ef4444',
                                                        fontStyle: 'italic',
                                                        padding: '4px 8px',
                                                        background: 'rgba(255,255,255,0.02)',
                                                        borderRadius: '4px'
                                                    }}>
                                                        Applied: {bm.appliedRule}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Tier Info Mapping - ONLY for Tiered Tab */}
                                        {activeTab === 'tiered' && bm.tierInfo && (
                                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '8px' }}>
                                                <p className="text-secondary" style={{ fontSize: '10px', margin: 0, fontStyle: 'italic', display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Mapping: {bm.tierInfo.name}</span>
                                                    {bm.tierInfo.rule && <span style={{ color: '#60a5fa', textTransform: 'uppercase', fontSize: '9px' }}>{bm.tierInfo.rule}</span>}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )
                ))}
            </div>
        </div >
    );
};

export default BiomarkerList;
