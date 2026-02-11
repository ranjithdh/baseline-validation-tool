import { type BaselineScoreResult } from '../utils/scoreCalculator';
import { BASELINE_CAPPING_RULES } from '../data/baselineCappingRules';

interface CalculationAuditProps {
    baselineScore: BaselineScoreResult;
}

export const CalculationAudit: React.FC<CalculationAuditProps> = ({ baselineScore }) => {
    const { markerAudits, cappingResult, finalizedScores, normalizedScores, originalTotals, totalBaselineScore, totalOriginalScore, preCappedScore, isCappedOverall } = baselineScore;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '2rem' }}>
            {/* Stage 1: API Mapping */}
            <section className="glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ background: '#10b981', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>1</span>
                    Stage 1: API Mapping & Data Retrieval
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Matching internal biomarkers to raw data from the DeepHolistics API.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {(['A', 'B', 'C'] as const).map(tier => {
                        const tierMarkers = markerAudits.filter(a => a.tier === tier);
                        if (tierMarkers.length === 0) return null;

                        return (
                            <div key={tier}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#10b981', marginBottom: '0.75rem', padding: '4px 8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '4px', display: 'inline-block' }}>
                                    Tier {tier}
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                                <th style={{ padding: '0.75rem' }}>Internal Name</th>
                                                <th style={{ padding: '0.75rem' }}>API Source Name</th>
                                                <th style={{ padding: '0.75rem' }}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tierMarkers.map((audit, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td style={{ padding: '0.75rem' }}>{audit.name}</td>
                                                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: audit.apiNameUsed ? 'inherit' : '#ef4444' }}>
                                                        {audit.apiNameUsed || 'Not Found'}
                                                    </td>
                                                    <td style={{ padding: '0.75rem' }}>
                                                        {audit.isMissing ? (
                                                            <span style={{ color: '#ef4444' }}>✖ Missing (Denominator Reduced)</span>
                                                        ) : audit.isSubstitute ? (
                                                            <span style={{ color: '#f59e0b' }}>⚠ Substitute Used ({audit.substituteValue})</span>
                                                        ) : (
                                                            <span style={{ color: '#10b981' }}>✔ Direct Match</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Stage 2: Rule Processing */}
            <section className="glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ background: '#10b981', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>2</span>
                    Stage 2: Individual Rule Processing
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Applying contextual rules and peer capping to individual rating ranks.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {(['A', 'B', 'C'] as const).map(tier => {
                        const tierMarkers = markerAudits.filter(a => a.tier === tier && !a.isMissing);
                        if (tierMarkers.length === 0) return null;

                        return (
                            <div key={tier}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#10b981', marginBottom: '0.75rem', padding: '4px 8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '4px', display: 'inline-block' }}>
                                    Tier {tier}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                                    {tierMarkers.map((audit, idx) => {
                                        const hasRule = !!audit.ruleApplied;
                                        return (
                                            <div key={idx} style={{
                                                padding: '1rem',
                                                background: 'rgba(255,255,255,0.02)',
                                                borderRadius: '8px',
                                                border: hasRule ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(255,255,255,0.05)'
                                            }}>
                                                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{audit.name}</div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                                                    <span>Original Rank:</span>
                                                    <span>{audit.originalRank}</span>
                                                </div>
                                                {hasRule && (
                                                    <>
                                                        <div style={{ fontSize: '0.7rem', color: '#10b981', fontStyle: 'italic', marginBottom: '0.25rem' }}>
                                                            Applied: {audit.ruleTitle || audit.ruleApplied}
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 'bold', color: '#10b981' }}>
                                                            <span>Final Capped Rank:</span>
                                                            <span>{audit.cappedRank}</span>
                                                        </div>
                                                    </>
                                                )}
                                                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                    Score: ({audit.cappedRank} / 5) × {audit.targetScore} = <strong>{audit.finalScore}</strong>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Stage 3: Tier Normalization */}
            <section className="glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ background: '#10b981', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>3</span>
                    Stage 3: Tier Normalization Logic
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Scaling achieved scores to the original fixed tier totals (600, 240, 160).
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {(['A', 'B', 'C'] as const).map(tier => {
                        const removedMarkers = markerAudits.filter(a => a.tier === tier && (a.isMissing || a.ruleApplied === 'suppress'));

                        return (
                            <div key={tier} style={{ padding: '1rem', borderLeft: '4px solid #10b981', background: 'rgba(16, 185, 129, 0.05)' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Tier {tier} Normalization</div>
                                <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                                    ({finalizedScores[tier].achieved.toFixed(2)} / {finalizedScores[tier].total}) × {originalTotals[tier]} = <strong style={{ color: '#10b981' }}>{normalizedScores[tier].toFixed(2)} / {originalTotals[tier]}</strong>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    Note: Denominator ({finalizedScores[tier].total}) reduced by {originalTotals[tier] - finalizedScores[tier].total} points due to missing/suppressed markers.
                                </div>
                                {removedMarkers.length > 0 && (
                                    <div style={{ fontSize: '0.7rem', color: '#ef4444', fontStyle: 'italic', marginTop: '0.25rem' }}>
                                        Removed: {removedMarkers.map(m => m.name).join(', ')}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Stage 4: Overall Baseline Capping */}
            <section className="glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ background: '#10b981', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>4</span>
                    Stage 4: Overall Dashboard Capping
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Evaluation of the 16 capping biomarkers to determine the final dashboard limit.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                    {cappingResult.cappingAudits.map((audit, idx) => {
                        const trigger = cappingResult.appliedRules.find(r => r.biomarkerName === audit.name);
                        const isWinningCap = trigger && trigger.capScore === cappingResult.lowestCap;
                        const rule = BASELINE_CAPPING_RULES.find(r => r.metricId === audit.metricId);

                        return (
                            <div key={idx} style={{
                                padding: '1rem',
                                borderRadius: '8px',
                                background: isWinningCap ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.02)',
                                border: isWinningCap ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.05)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{audit.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        Rank: {audit.isMissing ? 'N/A' : audit.originalRank}
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '4px', padding: '0.5rem' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Available Caps
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {rule?.caps.map((cap, cidx) => {
                                            const isSelected = !audit.isMissing && audit.originalRank === cap.rank;
                                            return (
                                                <div key={cidx} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    fontSize: '0.75rem',
                                                    padding: '2px 6px',
                                                    borderRadius: '3px',
                                                    background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                                                    color: isSelected ? '#10b981' : 'rgba(255,255,255,0.6)',
                                                    fontWeight: isSelected ? 'bold' : 'normal',
                                                    border: isSelected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent'
                                                }}>
                                                    <span>Rank {cap.rank}</span>
                                                    <span>Score: {cap.capScore}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {isWinningCap && (
                                    <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 'bold', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '4px', borderRadius: '4px' }}>
                                        Lowest Cap: {trigger.capScore}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Stage 5: Final Result */}
            <section style={{
                background: isCappedOverall ? 'rgba(239, 68, 68, 0.1)' : 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                border: `2px solid ${isCappedOverall ? '#ef4444' : '#10b981'}`,
                padding: '2rem',
                borderRadius: '12px',
                textAlign: 'center'
            }}>
                <h3 style={{ margin: '0 0 1rem 0', color: isCappedOverall ? '#ef4444' : '#10b981' }}>Stage 5: Final Calculation</h3>

                {/* Show pre-capped score */}
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Baseline Score (before capping): <strong style={{ color: '#10b981' }}>{(preCappedScore / 1000 * 100).toFixed(1)} / 100</strong>
                </div>

                <div style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
                    {isCappedOverall ? (
                        <>
                            <div style={{ color: '#ef4444', marginBottom: '0.5rem' }}>
                                ⚠️ Capped by Dashboard Rules
                            </div>
                            <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                                Baseline ({(preCappedScore / 1000 * 100).toFixed(1)}) exceeded lowest cap ({cappingResult.lowestCap})
                            </div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginTop: '1rem', color: '#ef4444' }}>
                                Final: {((totalBaselineScore / totalOriginalScore) * 100).toFixed(1)} / 100
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ color: '#10b981', marginBottom: '0.5rem' }}>
                                ✓ Within All Limits
                            </div>
                            <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                                Baseline {((totalBaselineScore / totalOriginalScore) * 100).toFixed(1)} is below lowest cap ({cappingResult.lowestCap || 'N/A'})
                            </div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginTop: '1rem', color: '#10b981' }}>
                                Final: {((totalBaselineScore / totalOriginalScore) * 100).toFixed(1)} / 100
                            </div>
                        </>
                    )}
                </div>
            </section>
        </div>
    );
};
