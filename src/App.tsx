import { useState, useEffect } from 'react'
import './index.css'
import LoginContainer from './components/mobile-login/LoginContainer'
import BiomarkerList from './components/BiomarkerList'
import UserSearch from './components/UserSearch'
import { fetchHealthData, fetchUserHealthData, fetchUserPIIData, calculateBMI, type HealthDataResponse, type PIIData } from './services/api'
import { type User } from './services/userService'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [healthData, setHealthData] = useState<HealthDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [piiData, setPiiData] = useState<PIIData | null>(null);
  const [bmi, setBmi] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsAuthenticated(true);

      // Restore selected user if exists
      const savedUser = localStorage.getItem('selected_user');
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          handleUserSelect(user);
        } catch (e) {
          console.error('Failed to parse saved user:', e);
          localStorage.removeItem('selected_user');
        }
      }
    }
  }, []);

  // Fetch default health data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadDefaultHealthData();
    }
  }, [isAuthenticated]);

  const loadDefaultHealthData = async () => {
    try {
      setLoading(true);
      const data = await fetchHealthData();
      setHealthData(data);
      setError(null);
      setSelectedUser(null); // Clear selected user for default data
      setPiiData(null);
      setBmi(null);
    } catch (err: any) {
      console.error('Failed to load health data:', err);
      setError(err.message || 'Failed to load health data');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleUserSelect = async (user: User) => {
    if (!user.id) {
      console.warn('Selected user has no ID, cannot fetch health data');
      return;
    }

    try {
      setLoading(true);
      setSelectedUser(user); // Track selected user
      localStorage.setItem('selected_user', JSON.stringify(user));

      // Fetch health data and PII data in parallel
      const [healthDataResult, piiDataResult] = await Promise.all([
        fetchUserHealthData(user.id),
        fetchUserPIIData(user.id).catch(err => {
          console.error('Failed to fetch PII data:', err);
          return null;
        })
      ]);

      setHealthData(healthDataResult);

      if (piiDataResult && piiDataResult.data && piiDataResult.data.pii_data) {
        const pii = piiDataResult.data.pii_data;
        setPiiData(pii);
        if (pii.height && pii.weight) {
          setBmi(calculateBMI(pii.height, pii.weight));
        } else {
          setBmi(null);
        }
      } else {
        setPiiData(null);
        setBmi(null);
      }

      setError(null);
    } catch (err: any) {
      console.error(`Failed to load data for user ${user.id}:`, err);
      setError(err.message || 'Failed to load user data');
      setHealthData(null);
      setSelectedUser(null); // Clear on error
      setPiiData(null);
      setBmi(null);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <LoginContainer onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="container" style={{ padding: 'var(--spacing-xl)', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, margin: 0 }}>Baseline Score Validation Tool</h1>
        <p className="text-secondary">Verify and validate the baseline score calculation logic.</p>
        <button
          onClick={() => {
            localStorage.removeItem('access_token');
            localStorage.removeItem('selected_user');
            setIsAuthenticated(false);
            setHealthData(null);
            setPiiData(null);
            setBmi(null);
          }}
          className="btn"
          style={{ marginTop: '1rem', background: '#334155' }}
        >
          Logout
        </button>
      </header>

      <main>
        <UserSearch onUserSelect={handleUserSelect} />

        {selectedUser && (
          <div style={{
            padding: '1rem 1.5rem',
            marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 600 }}>📊 Showing data for:</span>
            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white' }}>{selectedUser.name}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>({selectedUser.user_id})</span>
            {bmi !== null && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
                  Height: <strong>{piiData?.height} cm</strong>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>
                  Weight: <strong>{piiData?.weight} kg</strong>
                </div>
                <div style={{
                  padding: '4px 8px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  color: 'white'
                }}>
                  BMI: {bmi}
                </div>
              </div>
            )}
          </div>
        )}

        <BiomarkerList healthData={healthData} loading={loading} error={error} bmi={bmi} />
      </main>
    </div>
  )
}

export default App
