import React from 'react';
import { 
  Shield, 
  Settings, 
  RotateCcw, 
  Download, 
  Upload,
  Database, 
  Cpu,
  Layers,
  LayoutDashboard,
  Swords,
  Activity,
  Flag,
  FileSpreadsheet,
  CheckCircle2,
  Sliders
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
    { id: 'overview', label: 'Overview', IconComponent: LayoutDashboard },
    { id: 'mma', label: 'MMA / UFC', IconComponent: Swords },
    { id: 'nba', label: 'NBA Basketball', IconComponent: Activity },
    { id: 'golf', label: 'PGA Tour Golf', IconComponent: Flag },
  ];

  return (
    <header className="navbar-container">
      <div className="navbar-left">
        <div className="brand-badge" onClick={() => setCurrentSport('overview')}>
          <div className="brand-icon">
            <Shield size={18} className="text-blue-400" />
          </div>
          <div>
            <div className="brand-title">FANTASY GRINDER</div>
            <div className="brand-subtitle">ENTERPRISE OPTIMIZER</div>
          </div>
        </div>

        <nav className="nav-tabs">
          {sports.map(s => {
            const isActive = currentSport === s.id;
            const Icon = s.IconComponent;
            return (
              <button
                key={s.id}
                onClick={() => setCurrentSport(s.id)}
                className={`nav-tab ${isActive ? 'active' : ''}`}
              >
                <Icon size={14} className="tab-icon" />
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
              <Upload size={14} />
              <span>Import Slate</span>
            </button>

            <button 
              onClick={onLoadSample}
              className="btn-secondary"
              title="Load realistic DraftKings sample slate"
            >
              <Database size={14} />
              <span>Sample Slate</span>
            </button>

            <button 
              onClick={onOpenRules}
              className="btn-secondary"
              title="Configure optimization rules, strategy & constraints"
            >
              <Sliders size={14} />
              <span>Rules & Constraints</span>
            </button>

            <button 
              onClick={onReset}
              className="btn-ghost"
              title="Reset all locks and exclusions"
            >
              <RotateCcw size={14} />
            </button>

            {lineupCount > 0 && (
              <button 
                onClick={onExportCsv}
                className="btn-secondary"
                title="Download DraftKings contest upload CSV"
              >
                <FileSpreadsheet size={14} />
                <span>Export CSV ({lineupCount})</span>
              </button>
            )}

            <button 
              onClick={onOptimize} 
              disabled={isOptimizing}
              className="btn-primary"
            >
              <Cpu size={14} className={isOptimizing ? 'animate-spin' : ''} />
              <span>{isOptimizing ? 'Optimizing...' : 'Execute Optimizer'}</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
