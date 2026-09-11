import React, { useState } from 'react';
import { 
  Download, 
  Layers, 
  BarChart2, 
  Sparkles, 
  CheckCircle2, 
  Trash2,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Copy,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import AthleteAvatar from './AthleteAvatar';
import TeamLogo from './TeamLogo';

export default function LineupPanel({ 
  lineups, 
  playerAppearances, 
  totalLineups, 
  onExportCsv, 
  onClearLineups,
  currentSport,
  warning 
}) {
  const [activeTab, setActiveTab] = useState('lineups'); // 'lineups' | 'exposure'
  const [expandedLineupIndex, setExpandedLineupIndex] = useState(0); // expand first by default
  const [copiedIndex, setCopiedIndex] = useState(null);

  if (!lineups || lineups.length === 0) {
    return (
      <div className="empty-lineups-container">
        <div className="empty-icon-wrap">
          <Layers size={36} className="text-zinc-500" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-200 mt-3">No Lineups Generated Yet</h3>
        <p className="text-sm text-zinc-400 max-w-md mt-1 text-center">
          Lock your core athletes or adjust exposure rules, then click <strong className="text-blue-400">"Generate Lineups"</strong> to simulate and build DraftKings portfolios.
        </p>
      </div>
    );
  }

  // Calculate high-level portfolio stats
  const topProjection = Math.max(...lineups.map(l => l.totalProjection));
  const avgProjection = (lineups.reduce((s, l) => s + l.totalProjection, 0) / lineups.length).toFixed(1);
  const avgSalary = Math.round(lineups.reduce((s, l) => s + l.totalSalary, 0) / lineups.length);
  const avgOwnership = (lineups.reduce((s, l) => s + (l.totalOwnership || 0), 0) / lineups.length).toFixed(1);

  // Compile exposure list
  const uniquePlayers = [];
  const seenIds = new Set();
  lineups.forEach(l => {
    l.players.forEach(p => {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        const appearances = playerAppearances[p.id] || 0;
        const actualExpPct = Number(((appearances / lineups.length) * 100).toFixed(1));
        uniquePlayers.push({
          ...p,
          appearances,
          actualExpPct
        });
      }
    });
  });

  uniquePlayers.sort((a, b) => b.actualExpPct - a.actualExpPct);

  const handleCopyLineup = (lineup, index) => {
    const text = lineup.players.map(p => `${p.name} ($${p.salary})`).join(', ');
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="lineup-panel-container">
      {/* Portfolio Header Bar */}
      <div className="lineup-panel-header">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white tracking-tight">Lineups ({lineups.length})</span>
            {warning && (
              <span className="badge-warning" title={warning}>
                <AlertCircle size={13} />
                <span>Notice</span>
              </span>
            )}
          </div>

          <div className="tab-pill-group">
            <button
              onClick={() => setActiveTab('lineups')}
              className={`tab-pill ${activeTab === 'lineups' ? 'active' : ''}`}
            >
              <Layers size={14} />
              <span>Lineups List</span>
            </button>
            <button
              onClick={() => setActiveTab('exposure')}
              className={`tab-pill ${activeTab === 'exposure' ? 'active' : ''}`}
            >
              <BarChart2 size={14} />
              <span>Portfolio Exposure ({uniquePlayers.length})</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={onClearLineups} 
            className="clear-btn"
            title="Clear all generated lineups"
          >
            <Trash2 size={14} />
            <span>Clear</span>
          </button>
          <button 
            onClick={onExportCsv} 
            className="export-btn"
            title="Download CSV formatted for direct DraftKings import"
          >
            <Download size={14} />
            <span>Export DraftKings CSV</span>
          </button>
        </div>
      </div>

      {/* Portfolio Metric Strip */}
      <div className="portfolio-metric-strip">
        <div className="metric-box">
          <span className="metric-box-label">Top Lineup Proj</span>
          <span className="metric-box-val text-emerald-400 font-mono">{topProjection.toFixed(1)}</span>
        </div>
        <div className="metric-box">
          <span className="metric-box-label">Avg Portfolio Proj</span>
          <span className="metric-box-val text-blue-400 font-mono">{avgProjection}</span>
        </div>
        <div className="metric-box">
          <span className="metric-box-label">Avg Salary Spent</span>
          <span className="metric-box-val text-zinc-200 font-mono">${avgSalary.toLocaleString()}</span>
        </div>
        <div className="metric-box">
          <span className="metric-box-label">Avg Cumulative Own</span>
          <span className="metric-box-val text-amber-400 font-mono">{avgOwnership}%</span>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'lineups' ? (
        <div className="lineup-cards-grid">
          {lineups.map((lineup, idx) => {
            const isExpanded = expandedLineupIndex === idx;
            const remainingSalary = 50000 - lineup.totalSalary;

            return (
              <div 
                key={lineup.id || idx}
                className={`lineup-card ${isExpanded ? 'lineup-card-expanded' : ''}`}
              >
                {/* Lineup Card Header */}
                <div 
                  className="lineup-card-header cursor-pointer"
                  onClick={() => setExpandedLineupIndex(isExpanded ? null : idx)}
                >
                  <div className="flex items-center gap-3">
                    <span className="lineup-number-badge">#{idx + 1}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono text-base">
                          {lineup.totalProjection.toFixed(1)} FPTS
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                          ${lineup.totalSalary.toLocaleString()}
                        </span>
                        {remainingSalary > 0 && (
                          <span className="text-[11px] text-zinc-400 font-mono">
                            (${remainingSalary.toLocaleString()} rem)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopyLineup(lineup, idx); }}
                      className="text-xs p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                      title="Copy roster to clipboard"
                    >
                      {copiedIndex === idx ? <span className="text-emerald-400 text-xs font-semibold">Copied!</span> : <Copy size={14} />}
                    </button>
                    <div className="text-zinc-400">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* Avatar Preview Row (Top Competitor Feature: Sleeper / Sorare) */}
                <div className="lineup-avatars-row">
                  {lineup.players.map((p, pIdx) => (
                    <div key={p.id || pIdx} className="avatar-chip-wrap" title={`${p.name} - $${p.salary} (${p.projection} FPTS)`}>
                      <AthleteAvatar
                        src={p.avatarUrl}
                        name={p.name}
                        team={p.team}
                        sport={currentSport}
                        size="sm"
                      />
                      <span className="avatar-chip-name">{p.name.split(' ').pop()}</span>
                    </div>
                  ))}
                </div>

                {/* Expanded Details Table */}
                {isExpanded && (
                  <div className="lineup-expanded-table-wrap">
                    <table className="lineup-table">
                      <thead>
                        <tr>
                          <th className="text-left py-1 text-xs text-zinc-400 font-medium">Athlete</th>
                          {currentSport === 'nba' && <th className="text-center py-1 text-xs text-zinc-400">Pos</th>}
                          <th className="text-right py-1 text-xs text-zinc-400 font-medium">Salary</th>
                          <th className="text-right py-1 text-xs text-zinc-400 font-medium">Proj</th>
                          <th className="text-right py-1 text-xs text-zinc-400 font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineup.players.map((p) => {
                          const val = (p.projection / (p.salary / 1000)).toFixed(1);
                          return (
                            <tr key={p.id} className="border-t border-zinc-800/60">
                              <td className="py-2">
                                <div className="lineup-player-cell">
                                  <AthleteAvatar
                                    src={p.avatarUrl}
                                    name={p.name}
                                    team={p.team}
                                    sport={currentSport}
                                    size="xs"
                                  />
                                  <div className="lineup-player-meta">
                                    <div className="flex items-center gap-1.5">
                                      <span className="lineup-player-name">{p.name}</span>
                                      {p.team && <TeamLogo team={p.team} size={14} />}
                                    </div>
                                    <span className="lineup-player-bout">{p.gameInfo}</span>
                                  </div>
                                </div>
                              </td>
                              {currentSport === 'nba' && (
                                <td className="text-center py-2">
                                  <span className="pos-tag text-[10px]">{p.slot || p.positions?.[0]}</span>
                                </td>
                              )}
                              <td className="text-right py-2 font-mono text-xs text-zinc-300 tabular-nums">
                                ${p.salary.toLocaleString()}
                              </td>
                              <td className="text-right py-2 font-mono text-xs font-bold text-blue-400 tabular-nums">
                                {p.projection.toFixed(1)}
                              </td>
                              <td className="text-right py-2 font-mono text-xs text-zinc-400 tabular-nums">
                                {val}x
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Exposure Analytics Tab with Avatars */
        <div className="exposure-panel">
          <div className="exposure-table-wrap">
            <table className="exposure-table">
              <thead>
                <tr>
                  <th className="text-left py-2 text-xs text-zinc-400 font-medium">Athlete</th>
                  <th className="text-center py-2 text-xs text-zinc-400 font-medium">Lineups</th>
                  <th className="text-left py-2 text-xs text-zinc-400 font-medium w-52">Actual Exposure</th>
                  <th className="text-right py-2 text-xs text-zinc-400 font-medium">Max Limit</th>
                </tr>
              </thead>
              <tbody>
                {uniquePlayers.map(p => {
                  const isHigh = p.actualExpPct >= 50;
                  return (
                    <tr key={p.id} className="border-t border-zinc-800/80">
                      <td className="py-2.5">
                        <div className="exposure-athlete-cell">
                          <AthleteAvatar
                            src={p.avatarUrl}
                            name={p.name}
                            team={p.team}
                            sport={currentSport}
                            size="sm"
                          />
                          <div className="exposure-athlete-meta">
                            <div className="flex items-center gap-1.5">
                              <span className="exposure-athlete-name">{p.name}</span>
                              {p.team && <TeamLogo team={p.team} size={14} />}
                            </div>
                            <span className="exposure-athlete-sub">
                              ${p.salary.toLocaleString()} • {p.projection.toFixed(1)} FPTS
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-2.5 font-mono text-xs text-zinc-300">
                        {p.appearances} / {lineups.length}
                      </td>
                      <td className="py-2.5">
                        <div className="exposure-bar-wrap">
                          <div className="exposure-bar-bg">
                            <div 
                              className={`exposure-bar-fill ${
                                isHigh ? 'exposure-bar-fill-high' : 'exposure-bar-fill-normal'
                              }`}
                              style={{ width: `${p.actualExpPct}%` }}
                            />
                          </div>
                          <span className="exposure-bar-pct">
                            {p.actualExpPct}%
                          </span>
                        </div>
                      </td>
                      <td className="text-right py-2.5 font-mono text-xs text-zinc-400">
                        {p.maxExposure ?? 100}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
