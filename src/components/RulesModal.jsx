import React from 'react';
import { X, Check, Sliders, Shield, Zap, Sparkles } from 'lucide-react';

export default function RulesModal({ 
  isOpen, 
  onClose, 
  settings, 
  setSettings, 
  currentSport 
}) {
  if (!isOpen) return null;

  const strategies = [
    { 
      id: 'maxProjection', 
      name: 'Max Projection', 
      desc: 'Deterministic MILP solving the highest mathematical total fantasy points.' 
    },
    { 
      id: 'monteCarlo', 
      name: 'Monte Carlo Simulation', 
      desc: 'Stochastic normal sampling simulating contest volatility and correlations.' 
    },
    { 
      id: 'contrarian', 
      name: 'Contrarian GPP Leverage', 
      desc: 'Weights projections inversely by projected ownership (Proj / √Own%).' 
    },
    { 
      id: 'balanced', 
      name: 'Balanced Value', 
      desc: 'Blends raw projection with $/FPTS value ratio for steady cash builds.' 
    },
    { 
      id: 'salaryCap', 
      name: 'Salary Cap Maximizer', 
      desc: 'Forces the solver to maximize salary usage up to the $50,000 ceiling.' 
    },
  ];

  const lineupOptions = [10, 20, 50, 150];

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Sliders size={20} className="text-blue-400" />
            <h2 className="modal-title">Optimizer Rules & Settings</h2>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Strategy Selection */}
          <div className="form-section">
            <label className="section-label">Optimization Strategy</label>
            <div className="strategy-grid">
              {strategies.map(s => {
                const isSelected = settings.strategy === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => handleChange('strategy', s.id)}
                    className={`strategy-card ${isSelected ? 'selected' : ''}`}
                  >
                    <div className="strategy-card-header">
                      <div className="strategy-name">{s.name}</div>
                      {isSelected && <Check size={16} className="text-blue-400" />}
                    </div>
                    <div className="strategy-desc">{s.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lineup Count */}
          <div className="form-section">
            <label className="section-label">Target Lineups Count</label>
            <div className="flex gap-2 items-center">
              {lineupOptions.map(count => (
                <button
                  key={count}
                  onClick={() => handleChange('numLineups', count)}
                  className={`btn-chip ${settings.numLineups === count ? 'active' : ''}`}
                >
                  {count} Lineups
                </button>
              ))}
              <div className="flex items-center gap-2 ml-4">
                <span className="text-sm text-gray-400">Custom:</span>
                <input
                  type="number"
                  min="1"
                  max="150"
                  value={settings.numLineups}
                  onChange={e => handleChange('numLineups', Math.max(1, Math.min(150, parseInt(e.target.value) || 1)))}
                  className="input-number-sm"
                />
              </div>
            </div>
          </div>

          {/* Salary Constraints */}
          <div className="form-row">
            <div className="form-col">
              <label className="section-label">Salary Cap ($)</label>
              <input
                type="number"
                value={settings.salaryCap}
                onChange={e => handleChange('salaryCap', parseInt(e.target.value) || 50000)}
                className="input-text"
              />
            </div>
            <div className="form-col">
              <label className="section-label">Min Salary Floor ($)</label>
              <input
                type="number"
                value={settings.minSalary}
                onChange={e => handleChange('minSalary', parseInt(e.target.value) || 48000)}
                className="input-text"
              />
            </div>
          </div>

          {/* Exposure & Overlap Sliders */}
          <div className="form-row">
            <div className="form-col">
              <div className="flex justify-between items-center mb-1">
                <label className="section-label">Global Max Exposure</label>
                <span className="slider-value">{settings.maxExposure}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={settings.maxExposure}
                onChange={e => handleChange('maxExposure', parseInt(e.target.value))}
                className="input-range"
              />
              <div className="text-xs text-gray-400 mt-1">
                Limits any single player to appear in at most {settings.maxExposure}% of generated lineups.
              </div>
            </div>

            <div className="form-col">
              <div className="flex justify-between items-center mb-1">
                <label className="section-label">Max Player Overlap</label>
                <span className="slider-value">{settings.maxOverlap} players</span>
              </div>
              <input
                type="range"
                min="2"
                max={currentSport === 'nba' ? 7 : 5}
                step="1"
                value={settings.maxOverlap}
                onChange={e => handleChange('maxOverlap', parseInt(e.target.value))}
                className="input-range"
              />
              <div className="text-xs text-gray-400 mt-1">
                Ensures portfolio diversity by forbidding lineups with more than {settings.maxOverlap} shared players.
              </div>
            </div>
          </div>

          {/* Sport Specific Rules */}
          {currentSport === 'mma' && (
            <div className="sport-specific-box">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Allow Opponents (Fight Pairs)</div>
                  <div className="text-xs text-gray-400">
                    DraftKings MMA scoring severely penalizes rostering both fighters in the same bout. Keep disabled for tournament play.
                  </div>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.allowOpponents}
                    onChange={e => handleChange('allowOpponents', e.target.checked)}
                  />
                  <span className="switch-slider" />
                </label>
              </div>
            </div>
          )}

          {currentSport === 'nba' && (
            <div className="sport-specific-box">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Max Players Per Team</div>
                  <div className="text-xs text-gray-400">
                    Maximum number of players that can be drafted from the same NBA franchise (DraftKings allows up to 4).
                  </div>
                </div>
                <select
                  value={settings.maxPlayersPerTeam}
                  onChange={e => handleChange('maxPlayersPerTeam', parseInt(e.target.value))}
                  className="select-box"
                >
                  <option value={2}>2 Players</option>
                  <option value={3}>3 Players</option>
                  <option value={4}>4 Players (DK Classic Rule)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={onClose} className="btn-primary">
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}
