import React from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  Sliders, 
  BarChart3, 
  Cpu, 
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  FileSpreadsheet,
  Globe
} from 'lucide-react';

export default function SportOverview({ onSelectSport }) {
  const sports = [
    {
      id: 'mma',
      title: 'MMA / UFC',
      icon: '🥊',
      badge: 'Bout Constraints',
      accentColor: '#1E6A4E',
      description: 'Simulate bout outcomes, enforce opponent exclusions, manage exposure limits, and build high-upside GPP tournament lineups.',
      tags: ['Bout Opponent Exclusion', 'Monte Carlo Sim', 'Ownership Leverage'],
      rosterInfo: '6 Fighters • $50,000 Salary Cap • Single Tier'
    },
    {
      id: 'nba',
      title: 'NBA Basketball',
      icon: '🏀',
      badge: 'Classic 8-Slot',
      accentColor: '#B85C2E',
      description: 'Classic 8-slot DraftKings construction (PG, SG, SF, PF, C, G, F, UTIL) with team stacking rules, correlation, and injury reactivity.',
      tags: ['8 Classic Slots', 'Team Stacks (Max 4)', 'Position Eligibility'],
      rosterInfo: '8 Players • $50,000 Salary Cap • Multi-Position'
    },
    {
      id: 'golf',
      title: 'PGA Golf',
      icon: '⛳',
      badge: '6-Golfer Roster',
      accentColor: '#2B6C4A',
      description: 'Turn PGA tournament pools into balanced multi-entry portfolios with projection-driven knapsack solvers and exposure caps.',
      tags: ['Cut Probability', 'Single Pool', 'Exposure Caps'],
      rosterInfo: '6 Golfers • $50,000 Salary Cap • Cut-Making Upside'
    }
  ];

  return (
    <div className="overview-container">
      {/* Hero Card */}
      <section className="hero-banner">
        <div className="hero-content">
          <div className="hero-tag">
            <Sparkles size={14} className="text-amber-400" />
            <span>High-Speed Mathematical DFS Optimization</span>
          </div>
          <h1 className="hero-title">
            The Modern DFS Portfolio & Lineup Optimizer
          </h1>
          <p className="hero-description">
            Build 20, 50, or 150 mathematically sound, diversified lineups for DraftKings contests.
            Choose between Deterministic MILP, Monte Carlo simulations, value-balanced weighting, or GPP contrarian leverage.
          </p>

          <div className="hero-cta-group">
            <button 
              onClick={() => onSelectSport('mma')}
              className="hero-btn-primary"
            >
              <span>Launch MMA Optimizer</span>
              <ArrowRight size={16} />
            </button>
            <button 
              onClick={() => onSelectSport('nba')}
              className="hero-btn-secondary"
            >
              <span>Launch NBA Optimizer</span>
            </button>
            <button 
              onClick={() => onSelectSport('golf')}
              className="hero-btn-ghost"
            >
              <span>Launch Golf Optimizer</span>
            </button>
          </div>
        </div>

        <div className="hero-stats-card">
          <div className="stat-item">
            <div className="stat-label">Solver Engine</div>
            <div className="stat-value text-emerald-400">MILP + Monte Carlo</div>
            <div className="stat-sub">Branch & Bound with LP pruning</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-label">Diversity Control</div>
            <div className="stat-value text-blue-400">Max Overlap Limit</div>
            <div className="stat-sub">Prevents duplicated portfolio exposure</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-label">Export Compatibility</div>
            <div className="stat-value text-purple-400">DraftKings CSV</div>
            <div className="stat-sub">1-Click import into official contests</div>
          </div>
        </div>
      </section>

      {/* Sport Selector Cards */}
      <section className="sports-grid">
        {sports.map(s => (
          <div 
            key={s.id} 
            className="sport-card"
            onClick={() => onSelectSport(s.id)}
          >
            <div className="sport-card-top">
              <span className="sport-card-emoji">{s.icon}</span>
              <span className="sport-card-badge">{s.badge}</span>
            </div>
            <h3 className="sport-card-title">{s.title}</h3>
            <p className="sport-card-desc">{s.description}</p>
            
            <div className="sport-card-roster">{s.rosterInfo}</div>

            <div className="sport-card-tags">
              {s.tags.map(t => (
                <span key={t} className="sport-tag">{t}</span>
              ))}
            </div>

            <button className="sport-card-action">
              <span>Open {s.title} Pool</span>
              <ArrowRight size={15} />
            </button>
          </div>
        ))}
      </section>

      {/* Workflow Step Strip */}
      <section className="workflow-section">
        <h2 className="section-title">End-to-End Lineup Construction Pipeline</h2>
        <div className="workflow-grid">
          <div className="workflow-step">
            <div className="step-num">01</div>
            <div className="step-content">
              <h4>Curate Slate & Pool</h4>
              <p>Load real sample slates or upload CSVs. Inspect projection, salary, ownership, and value metrics.</p>
            </div>
          </div>
          <div className="workflow-step">
            <div className="step-num">02</div>
            <div className="step-content">
              <h4>Lock, Exclude & Boost</h4>
              <p>Lock core anchors 🔒, eliminate fades ⛔, or fine-tune individual player boost points and exposure caps.</p>
            </div>
          </div>
          <div className="workflow-step">
            <div className="step-num">03</div>
            <div className="step-content">
              <h4>Simulate & Solve</h4>
              <p>Execute branch-and-bound linear programming or Monte Carlo stochastic simulations across 20 to 150 lineups.</p>
            </div>
          </div>
          <div className="workflow-step">
            <div className="step-num">04</div>
            <div className="step-content">
              <h4>Review & Export</h4>
              <p>Inspect portfolio exposure distributions and download official DraftKings format CSV ready for upload.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
