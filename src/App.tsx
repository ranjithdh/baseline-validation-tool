import './index.css'
import BiomarkerList from './components/BiomarkerList'

function App() {
  return (
    <div className="container" style={{ padding: 'var(--spacing-xl)', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, margin: 0 }}>Baseline Score Validation Tool</h1>
        <p className="text-secondary">Verify and validate the baseline score calculation logic.</p>
      </header>

      <main>
        <BiomarkerList />
      </main>
    </div>
  )
}

export default App
