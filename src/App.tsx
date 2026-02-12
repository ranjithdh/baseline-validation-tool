import { useState, useEffect } from 'react'
import './index.css'
import LoginContainer from './components/login/LoginContainer'
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
    } else if (import.meta.env.MODE === 'development') {
      // Auto-login for development
      setIsAuthenticated(true);
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
      // Create a default user object for display purposes
      const defaultUser: User = {
        id: 'default',
        user_id: 'default-user',
        name: 'Default User',
        email: 'default@example.com',
        mobile: '',
        gender: '',
        dob: '',
        lead_id: ''
      };
      setSelectedUser(defaultUser);
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
    <div className="container">
      <header style={{
        marginBottom: 'var(--space-2xl)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
            Baseline <span style={{ color: 'var(--primary)' }}>Validator</span>
          </h1>
          <p className="text-secondary" style={{ fontSize: '1rem' }}>
            Premium Audit & Validation Engine
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
          <button
            onClick={() => {
              localStorage.removeItem('access_token');
              localStorage.removeItem('selected_user');
              setIsAuthenticated(false);
              setHealthData(null);
              setPiiData(null);
              setBmi(null);
            }}
            className="btn btn-secondary"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
        <section className="glass" style={{ borderRadius: '20px', padding: 'var(--space-lg)' }}>
          <UserSearch onUserSelect={handleUserSelect} />
        </section>

        {selectedUser && (
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'var(--bg-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>
                  👤
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem' }}>{selectedUser.name}</h2>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)', fontSize: '0.85rem' }} className="text-secondary">
                    <span>ID: {selectedUser.id}</span>
                  </div>
                </div>
              </div>

              {bmi !== null && (
                <div style={{ display: 'flex', gap: 'var(--space-xl)' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>BMI Index</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{bmi}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Metrics</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{piiData?.height}cm / {piiData?.weight}kg</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <section>
          <BiomarkerList healthData={healthData} loading={loading} error={error} bmi={bmi} />
        </section>
      </main>
    </div>
  )
}

export default App
