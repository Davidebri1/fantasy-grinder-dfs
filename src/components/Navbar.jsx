import React from 'react';
import { 
  Zap, 
  Settings, 
  RotateCcw, 
  Download, 
  Database, 
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function Navbar({ 
  currentSport, 
  setCurrentSport, 
  onLoadSample, 
  onOpenImport,
  onOpenRules, 
  onOptimize, 
  isOptimizing,
  onReset,
  lineupCount,
  onExportCsv
}) {
  const sports = [
    { id: 'overview', label: 'Overview', icon: '⚡' },
    { id: 'mma', label: 'MMA (UFC)', icon: '🥊', color: 'emerald' },
    { id: 'nba', label: 'NBA', icon: '🏀', color: 'orange' },
    { id: 'golf', label: 'PGA Golf', icon: '⛳', color: 'teal' },
  ];

  return (
    <header className="navbar-container">
      <div className="navbar-left">
        <div className="brand-badge" onClick={() => setCurrentSport('overview')}>
          <div className="brand-icon">
            <Zap size={20} className="text-blue-400" />
          </div>
          <div>
            <div className="brand-title">Fantasy Grinder</div>
            <div className="brand-subtitle">DFS Portfolio Optimizer</div>
          </div>
        </div>

        <nav className="nav-tabs">
          {sports.map(s => {
            const isActive = currentSport === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setCurrentSport(s.id)}
                className={`nav-tab ${isActive ? 'active' : ''} ${s.color || ''}`}
              >
                <span className="tab-icon">{s.icon}</span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="navbar-right">
        {currentSport !== 'overview' && (
          <>
            <button 
              onClick={onOpenImport}
              className="btn-secondary"
              title="Import DraftKings CSV contest slate"
            >
              <Download size={15} style={{ transform: 'rotate(180deg)' }} />
              <span>Import CSV</span>
            </button>

            <button 
              onClick={onLoadSample}
              className="btn-secondary"
              title="Load realistic DraftKings sample slate"
            >
              <Database size={15} />
              <span>Sample Slate</span>
            </button>

            <button 
              onClick={onOpenRules}
              className="btn-secondary"
              title="Configure optimization rules, strategy & constraints"
            >
              <Settings size={15} />
              <span>Rules & Settings</span>
            </button>

            <button 
              onClick={onReset}
              className="btn-ghost"
              title="Reset locks and exclusions"
            >
              <RotateCcw size={15} />
            </button>

            {lineupCount > 0 && (
              <button 
                onClick={onExportCsv}
                className="btn-accent"
                title="Download DraftKings compliant CSV"
              >
                <Download size={15} />
                <span>Export CSV</span>
              </button>
            )}

            <button 
              onClick={onOptimize}
              disabled={isOptimizing}
              className="btn-primary"
            >
              <Sparkles size={16} className={isOptimizing ? 'animate-spin' : ''} />
              <span>{isOptimizing ? 'Optimizing...' : 'Generate Lineups'}</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
