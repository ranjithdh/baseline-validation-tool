import React, { useState } from 'react';
import { type BaselineScoreResult } from '../utils/scoreCalculator';
import { BASELINE_CAPPING_RULES } from '../data/baselineCappingRules';

interface CalculationAuditProps {
    baselineScore: BaselineScoreResult;
}

export const CalculationAudit: React.FC<CalculationAuditProps> = ({ baselineScore }) => {
    const [activeStage, setActiveStage] = useState(1);
    const { markerAudits, cappingResult, finalizedScores, normalizedScores, originalTotals, totalBaselineScore, totalOriginalScore, preCappedScore, isCappedOverall } = baselineScore;

    const stages = [
        { id: 1, title: 'API Mapping', description: 'Data Integrity' },
        { id: 2, title: 'Individual Rules', description: 'Rank Processing' },
        { id: 3, title: 'Tier Normalization', description: 'Scale Logic' },
        { id: 4, title: 'Dashboard Capping', description: 'Final Limit' }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
            {/* Stepper Navigation */}
            <div className="glass" style={{
                padding: 'var(--space-md)',
                borderRadius: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 'var(--space-md)'
            }}>
                {stages.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setActiveStage(s.id)}
                        className="btn"
                        style={{
                            background: activeStage === s.id ? 'var(--bg-surface)' : 'transparent',
                            border: activeStage === s.id ? '1px solid var(--border)' : '1px solid transparent',
                            color: activeStage === s.id ? 'var(--primary)' : 'var(--text-muted)',
                            flexDirection: 'column',
                            padding: 'var(--space-md)',
                            gap: 'var(--space-xs)',
                            height: 'auto',
                            boxShadow: activeStage === s.id ? 'var(--shadow-md)' : 'none'
                        }}
                    >
                        <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: activeStage === s.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            color: activeStage === s.id ? '#052e16' : 'inherit',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 800
                        }}>
                            {s.id}
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{s.title}</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{s.description}</div>
                    </button>
                ))}
            </div>

            {/* Stage Content */}
            <div className="card" style={{ minHeight: '400px', animation: 'fadeIn 0.3s ease' }}>
                {activeStage === 1 && (
                    <section>
                        <div style={{ marginBottom: 'var(--space-xl)' }}>
                            <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>Stage 1: API Mapping & Integrity</h3>
                            <p className="text-secondary">Verifying the connection between internal biomarker definitions and raw data retrieved from the DeepHolistics staging engine.</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                            {(['A', 'B', 'C'] as const).map(tier => {
                                const tierMarkers = markerAudits.filter(a => a.tier === tier);
                                if (tierMarkers.length === 0) return null;

                                return (
                                    <div key={tier}>
                                        <div className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 'var(--space-md)', letterSpacing: '0.1em' }}>Tier {tier} Biomarkers</div>
                                        <div className="glass" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                                <thead>
                                                    <tr style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                                                        <th style={{ padding: '1rem' }}>Definition</th>
                                                        <th style={{ padding: '1rem' }}>Backend Identifier</th>
                                                        <th style={{ padding: '1rem', textAlign: 'right' }}>Integrity Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {tierMarkers.map((audit, idx) => (
                                                        <tr key={idx} style={{ borderBottom: idx === tierMarkers.length - 1 ? 'none' : '1px solid var(--border)' }}>
                                                            <td style={{ padding: '1rem', fontWeight: 600 }}>{audit.name}</td>
                                                            <td style={{ padding: '1rem', fontFamily: 'monospace', color: audit.apiNameUsed ? 'var(--text-secondary)' : 'var(--error)' }}>
                                                                {audit.apiNameUsed || 'Undefined Reference'}
                                                            </td>
                                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                                <span style={{
                                                                    padding: '4px 10px',
                                                                    borderRadius: '20px',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 700,
                                                                    background: audit.isMissing ? 'rgba(239, 68, 68, 0.1)' : audit.isSubstitute ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                                    color: audit.isMissing ? 'var(--error)' : audit.isSubstitute ? 'var(--warning)' : 'var(--success)'
                                                                }}>
                                                                    {audit.isMissing ? 'MISSING' : audit.isSubstitute ? 'SUBSTITUTED' : 'VERIFIED'}
                                                                </span>
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
                )}

                {activeStage === 2 && (
                    <section>
                        <div style={{ marginBottom: 'var(--space-xl)' }}>
                            <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>Stage 2: Rank & Logic Processing</h3>
                            <p className="text-secondary">Applying individual capping rules and contextual logic to resolve final rating ranks.</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                            {(['A', 'B', 'C'] as const).map(tier => {
                                const tierMarkers = markerAudits.filter(a => a.tier === tier && !a.isMissing);
                                if (tierMarkers.length === 0) return null;

                                return (
                                    <div key={tier}>
                                        <div className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 'var(--space-md)', letterSpacing: '0.1em' }}>Tier {tier} Biomarkers</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
                                            {tierMarkers.map((audit, idx) => {
                                                const hasRule = !!audit.ruleApplied;
                                                return (
                                                    <div key={idx} className="glass" style={{ padding: 'var(--space-md)', borderRadius: '12px' }}>
                                                        <div style={{ fontWeight: 600, marginBottom: 'var(--space-sm)' }}>{audit.name}</div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '8px' }}>
                                                            <span className="text-muted">Initial Rank:</span>
                                                            <span>{audit.originalRank}</span>
                                                        </div>
                                                        {hasRule ? (
                                                            <div style={{
                                                                padding: '8px',
                                                                background: 'rgba(16, 185, 129, 0.05)',
                                                                borderRadius: '8px',
                                                                border: '1px solid rgba(16, 185, 129, 0.1)'
                                                            }}>
                                                                <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                                                                    {audit.ruleTitle ? `${audit.ruleTitle}: ${audit.ruleApplied}` : audit.ruleApplied || 'Special Logic Applied'}
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>
                                                                    <span>Resolved Rank:</span>
                                                                    <span>{audit.cappedRank ?? 'Suppressed'}</span>
                                                                </div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginBottom: '6px', opacity: 0.9 }}>
                                                                    Source: <span style={{ fontWeight: 700 }}>{audit.apiNameUsed}</span>
                                                                </div>
                                                                <div style={{ fontSize: '0.75rem', opacity: 0.8, color: 'var(--primary)', borderTop: '1px solid rgba(16, 185, 129, 0.1)', paddingTop: '4px' }}>
                                                                    Calc: ({audit.cappedRank ?? 0} / 5) × {audit.targetScore} = {audit.finalScore}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-muted" style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>No special rules triggered.</div>
                                                        )}
                                                        <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border)', fontSize: '0.8rem' }}>
                                                            Component Score: <strong style={{ color: 'var(--text-primary)' }}>{audit.finalScore} Pts</strong>
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
                )}

                {activeStage === 3 && (
                    <section>
                        <div style={{ marginBottom: 'var(--space-xl)' }}>
                            <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>Stage 3: Normalization & Scaling</h3>
                            <p className="text-secondary">Extrapolating current results to align with the core engine's original weighted distribution.</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            {(['A', 'B', 'C'] as const).map(tier => {
                                const removedMarkers = markerAudits.filter(a => a.tier === tier && (a.isMissing || a.ruleApplied === 'suppress'));
                                return (
                                    <div key={tier} className="glass" style={{ padding: 'var(--space-lg)', borderRadius: '16px', borderLeft: '4px solid var(--primary)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                                            <h4 style={{ color: 'var(--primary)', textTransform: 'uppercase' }}>Tier {tier} Variance</h4>
                                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>Base Weight: {originalTotals[tier]}</div>
                                        </div>
                                        <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 'var(--space-sm)' }}>
                                            {normalizedScores[tier].toFixed(2)}
                                            <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '8px' }}>pts normalized</span>
                                        </div>
                                        <div className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: 'var(--space-md)' }}>
                                            Calculation: <code>({finalizedScores[tier].achieved.toFixed(2)} / {finalizedScores[tier].total}) × {originalTotals[tier]}</code>
                                        </div>
                                        {removedMarkers.length > 0 && (
                                            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.03)', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--error)' }}>
                                                <strong>Excluded:</strong> {removedMarkers.map(m => m.name).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {activeStage === 4 && (
                    <section>
                        <div style={{ marginBottom: 'var(--space-xl)' }}>
                            <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>Stage 4: Aggregate Dashboard Capping</h3>
                            <p className="text-secondary">Evaluating global limits based on critical biomarkers to determine the absolute maximum score.</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-md)' }}>
                            {cappingResult.cappingAudits.map((audit, idx) => {
                                const trigger = cappingResult.appliedRules.find(r => r.biomarkerName === audit.name);
                                const isWinningCap = trigger && trigger.capScore === cappingResult.lowestCap;
                                const rule = BASELINE_CAPPING_RULES.find(r => r.metricId === audit.metricId);

                                return (
                                    <div key={idx} className="glass" style={{
                                        padding: 'var(--space-md)',
                                        borderRadius: '16px',
                                        border: isWinningCap ? '2px solid var(--error)' : '1px solid var(--border)',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        {isWinningCap && <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--error)', color: 'white', fontSize: '0.6rem', padding: '2px 8px', fontWeight: 800 }}>ACTIVE CAP</div>}
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>{audit.name}</div>
                                        <div className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                                            Detected: {audit.value} {audit.unit}
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 'var(--space-md)' }}>Rank detected: {audit.isMissing ? 'None' : audit.originalRank}</div>

                                        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: 'var(--space-sm)' }}>
                                            {rule?.caps.map((cap, cidx) => {
                                                const isSelected = !audit.isMissing && audit.originalRank === cap.rank;
                                                return (
                                                    <div key={cidx} style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        fontSize: '0.75rem',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                                                        color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                                                        fontWeight: isSelected ? 700 : 400
                                                    }}>
                                                        <span>Rank {cap.rank}</span>
                                                        <span>Cap: {cap.capScore}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="glass" style={{
                            marginTop: 'var(--space-xl)',
                            padding: 'var(--space-xl)',
                            borderRadius: '20px',
                            textAlign: 'center',
                            background: isCappedOverall ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)',
                            border: `1px solid ${isCappedOverall ? 'var(--error)' : 'var(--primary)'}`
                        }}>
                            <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-sm)' }}>Final Performance Index</div>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '8px' }}>
                                <div style={{ fontSize: '3rem', fontWeight: 800, color: isCappedOverall ? 'var(--error)' : 'var(--primary)' }}>
                                    {((totalBaselineScore / totalOriginalScore) * 100).toFixed(2)}
                                </div>
                                <div style={{ fontSize: '1.25rem', opacity: 0.5 }}>/ 100.0</div>
                                {isCappedOverall && (
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '12px', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>
                                        {((preCappedScore / totalOriginalScore) * 100).toFixed(2)} (Pre-capped)
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}
            </div>

            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
        </div>
    );
};
