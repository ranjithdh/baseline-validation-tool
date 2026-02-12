import React, { useState, useEffect } from 'react';
import { userService, type User } from '../services/userService';
import { fetchUserHealthData, fetchUserPIIData, calculateBMI } from '../services/api';
import { calculateBaselineScore } from '../utils/scoreCalculator';

const UsersTab: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const data = await userService.fetchUsers();
                setUsers(data);
            } catch (err) {
                console.error('Failed to load users');
            }
        };
        loadUsers();
    }, []);

    const downloadCSV = async () => {
        setLoading(true);
        setProgress({ current: 0, total: users.length });

        const results = [];
        const batchSize = 5;

        for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize);
            const batchPromises = batch.map(async (user) => {
                try {
                    // Skip if no ID
                    if (!user.id) return null;

                    const [healthData, piiDataResponse] = await Promise.all([
                        fetchUserHealthData(user.id),
                        fetchUserPIIData(user.id).catch(() => null)
                    ]);

                    let bmi = null;
                    if (piiDataResponse?.data?.pii_data) {
                        const pii = piiDataResponse.data.pii_data;
                        if (pii.height && pii.weight) {
                            bmi = calculateBMI(pii.height, pii.weight);
                        }
                    }

                    const scoreResult = calculateBaselineScore(healthData, bmi);

                    if (!scoreResult) {
                        return {
                            userName: user.name || 'Unknown',
                            userId: user.id,
                            scoreBeforeCapping: 'Biomarker data not available',
                            finalScore: 'Biomarker data not available'
                        };
                    }

                    const preCappedPerc = ((scoreResult.preCappedScore / scoreResult.totalOriginalScore) * 100).toFixed(2);
                    const finalPerc = ((scoreResult.totalBaselineScore / scoreResult.totalOriginalScore) * 100).toFixed(2);

                    return {
                        userName: user.name || 'Unknown',
                        userId: user.id,
                        scoreBeforeCapping: preCappedPerc,
                        finalScore: finalPerc
                    };
                } catch (error: any) {
                    console.error(`Error processing user ${user.id}:`, error);
                    const errorMessage = error.message || 'Unknown error';
                    return {
                        userName: user.name || 'Unknown',
                        userId: user.id,
                        scoreBeforeCapping: `Error: ${errorMessage}`,
                        finalScore: `Error: ${errorMessage}`
                    };
                }
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults.filter(r => r !== null));
            setProgress(p => ({ ...p, current: Math.min(i + batchSize, users.length) }));
        }

        // Generate CSV
        const headers = ['userName', 'userId', 'Score Before Capping', 'Final Score (After Capping)'];
        const csvContent = [
            headers.join(','),
            ...results.map(r => [
                `"${r!.userName}"`,
                `"${r!.userId}"`,
                `"${r!.scoreBeforeCapping}"`,
                `"${r!.finalScore}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `baseline_scores_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setLoading(false);
    };

    return (
        <div className="users-tab">
            <div className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)', background: 'var(--bg-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-xs)' }}>User Score Export</h2>
                        <p className="text-secondary">Execute baseline score calculations and export CSV for all {users.length} users.</p>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={downloadCSV}
                        disabled={loading || users.length === 0}
                        style={{ padding: '12px 28px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
                    >
                        {loading ? (
                            <>
                                <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                                Processing...
                            </>
                        ) : (
                            <>
                                📥 Download CSV
                            </>
                        )}
                    </button>
                </div>

                {loading && (
                    <div style={{ marginTop: 'var(--space-xl)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)', fontSize: '0.85rem' }}>
                            <span className="text-secondary">Scanning Users: <strong style={{ color: 'var(--text-primary)' }}>{progress.current}</strong> / {progress.total}</span>
                            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{Math.round((progress.current / progress.total) * 100)}%</span>
                        </div>
                        <div style={{ height: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '5px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                            <div style={{
                                height: '100%',
                                width: `${(progress.current / progress.total) * 100}%`,
                                background: 'linear-gradient(90deg, var(--primary) 0%, #34d399 100%)',
                                boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)',
                                transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                            }} />
                        </div>
                    </div>
                )}
            </div>

            <div className="card" style={{ overflow: 'hidden', padding: 0, border: '1px solid var(--border)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '1.25rem var(--space-lg)', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User Name</th>
                                <th style={{ padding: '1.25rem var(--space-lg)', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User ID</th>
                                <th style={{ padding: '1.25rem var(--space-lg)', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
                                <th style={{ padding: '1.25rem var(--space-lg)', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user, idx) => (
                                <tr key={user.user_id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ padding: '1.1rem var(--space-lg)', fontWeight: 500 }}>{user.name || 'N/A'}</td>
                                    <td style={{ padding: '1.1rem var(--space-lg)' }}><span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>{user.id}</span></td>
                                    <td style={{ padding: '1.1rem var(--space-lg)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{user.email || 'N/A'}</td>
                                    <td style={{ padding: '1.1rem var(--space-lg)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{user.mobile || 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {users.length === 0 && (
                    <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No users found in the system.
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default UsersTab;
