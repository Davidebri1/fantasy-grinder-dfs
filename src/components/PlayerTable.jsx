import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Lock, 
  Unlock, 
  Ban, 
  RotateCcw, 
  ArrowUpDown, 
  Plus, 
  Minus,
  Sparkles,
  TrendingUp,
  Shield,
  SlidersHorizontal,
  Flame,
  Star
} from 'lucide-react';
import AthleteAvatar from './AthleteAvatar';
import TeamLogo from './TeamLogo';

export default function PlayerTable({ 
  players, 
  onToggleLock, 
  onToggleExclude, 
  onUpdateBoost, 
  onUpdateMaxExp,
  currentSport,
  onResetAll
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // all, locked, excluded, studs, value
  const [nbaPosFilter, setNbaPosFilter] = useState('ALL');
  const [sortField, setSortField] = useState('salary');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedPlayers = useMemo(() => {
    return players
      .filter(p => {
        // Search
        const nameMatch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const teamMatch = p.team ? p.team.toLowerCase().includes(searchTerm.toLowerCase()) : false;
        const boutMatch = p.gameInfo ? p.gameInfo.toLowerCase().includes(searchTerm.toLowerCase()) : false;
        if (!nameMatch && !teamMatch && !boutMatch) return false;

        // Quick status filter
        if (activeFilter === 'locked' && !p.isLocked) return false;
        if (activeFilter === 'excluded' && !p.isExcluded) return false;
        if (activeFilter === 'studs' && p.salary < 9000) return false;
        if (activeFilter === 'value') {
          const val = (p.projection + (p.boost || 0)) / (p.salary / 1000);
          if (val < 2.5) return false;
        }

        // NBA position filter
        if (currentSport === 'nba' && nbaPosFilter !== 'ALL') {
          if (nbaPosFilter === 'G') {
            if (!p.positions.includes('PG') && !p.positions.includes('SG')) return false;
          } else if (nbaPosFilter === 'F') {
            if (!p.positions.includes('SF') && !p.positions.includes('PF')) return false;
          } else if (nbaPosFilter === 'UTIL') {
            return true;
          } else {
            if (!p.positions.includes(nbaPosFilter)) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === 'effectiveProj') {
          valA = a.projection + (a.boost || 0);
          valB = b.projection + (b.boost || 0);
        } else if (sortField === 'value') {
          valA = (a.projection + (a.boost || 0)) / (a.salary / 1000);
          valB = (b.projection + (b.boost || 0)) / (b.salary / 1000);
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [players, searchTerm, activeFilter, nbaPosFilter, sortField, sortDirection, currentSport]);

  const lockedCount = players.filter(p => p.isLocked).length;
  const excludedCount = players.filter(p => p.isExcluded).length;
  const avgSalary = Math.round(players.reduce((s, p) => s + p.salary, 0) / (players.length || 1));

  return (
    <div className="player-table-container">
      {/* Table Toolbar */}
      <div className="table-toolbar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder={`Search ${players.length} ${currentSport.toUpperCase()} athletes, bouts, teams...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="search-clear">×</button>
          )}
        </div>

        {/* Quick Filter Tabs */}
        <div className="filter-chips">
          <button 
            className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All Athletes ({players.length})
          </button>
          <button 
            className={`filter-chip ${activeFilter === 'studs' ? 'active' : ''}`}
            onClick={() => setActiveFilter('studs')}
          >
            <Flame size={13} className="text-amber-400" />
            Studs ($9k+)
          </button>
          <button 
            className={`filter-chip ${activeFilter === 'value' ? 'active' : ''}`}
            onClick={() => setActiveFilter('value')}
          >
            <TrendingUp size={13} className="text-emerald-400" />
            Top Value
          </button>
          <button 
            className={`filter-chip ${activeFilter === 'locked' ? 'active' : ''}`}
            onClick={() => setActiveFilter('locked')}
          >
            <Lock size={12} className="text-emerald-400" />
            Locked ({lockedCount})
          </button>
          <button 
            className={`filter-chip ${activeFilter === 'excluded' ? 'active' : ''}`}
            onClick={() => setActiveFilter('excluded')}
          >
            <Ban size={12} className="text-rose-400" />
            Faded ({excludedCount})
          </button>

          {(lockedCount > 0 || excludedCount > 0) && (
            <button 
              onClick={onResetAll}
              className="filter-chip reset-chip"
              title="Reset all locks and exclusions"
            >
              <RotateCcw size={12} />
              Reset All
            </button>
          )}
        </div>
      </div>

      {/* NBA Position Bar */}
      {currentSport === 'nba' && (
        <div className="nba-pos-bar">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mr-2">Position:</span>
          {['ALL', 'PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL'].map(pos => (
            <button
              key={pos}
              onClick={() => setNbaPosFilter(pos)}
              className={`pos-btn ${nbaPosFilter === pos ? 'pos-btn-active' : ''}`}
            >
              {pos}
            </button>
          ))}
        </div>
      )}

      {/* Modern High-Density Table with Athlete Avatars */}
      <div className="table-wrapper">
        <table className="player-table">
          <thead>
            <tr>
              <th className="w-16 text-center">Actions</th>
              <th className="th-sortable" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1.5">
                  <span>Athlete & Matchup</span>
                  <ArrowUpDown size={12} className="text-zinc-500" />
                </div>
              </th>
              {currentSport === 'nba' && (
                <th className="w-20 text-center">Pos</th>
              )}
              <th onClick={() => handleSort('salary')} className="th-sortable text-right w-24">
                <div className="flex items-center justify-end gap-1.5">
                  <span>Salary</span>
                  <ArrowUpDown size={12} className="text-zinc-500" />
                </div>
              </th>
              <th onClick={() => handleSort('effectiveProj')} className="th-sortable text-right w-28">
                <div className="flex items-center justify-end gap-1.5">
                  <span>Proj FPTS</span>
                  <ArrowUpDown size={12} className="text-zinc-500" />
                </div>
              </th>
              <th onClick={() => handleSort('value')} className="th-sortable text-right w-24">
                <div className="flex items-center justify-end gap-1.5">
                  <span>Value</span>
                  <ArrowUpDown size={12} className="text-zinc-500" />
                </div>
              </th>
              <th onClick={() => handleSort('projectedOwnership')} className="th-sortable text-right w-24">
                <div className="flex items-center justify-end gap-1.5">
                  <span>Own %</span>
                  <ArrowUpDown size={12} className="text-zinc-500" />
                </div>
              </th>
              <th className="text-center w-28">Max Exp %</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedPlayers.length === 0 ? (
              <tr>
                <td colSpan={currentSport === 'nba' ? 8 : 7} className="text-center py-16 text-zinc-400">
                  <div className="flex flex-col items-center gap-2">
                    <Search size={32} className="text-zinc-600 mb-1" />
                    <p className="font-semibold text-zinc-300">No athletes found matching filters</p>
                    <button 
                      onClick={() => { setSearchTerm(''); setActiveFilter('all'); setNbaPosFilter('ALL'); }}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      Clear all search criteria
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredAndSortedPlayers.map(p => {
                const effectiveProj = Number(p.projection || 0) + Number(p.boost || 0);
                const valueRatio = (effectiveProj / (p.salary / 1000)).toFixed(2);
                const isHighValue = Number(valueRatio) >= 3.0;

                return (
                  <tr 
                    key={p.id}
                    className={`table-row ${p.isLocked ? 'row-locked' : ''} ${p.isExcluded ? 'row-excluded' : ''}`}
                  >
                    {/* Action buttons (Lock / Ban) */}
                    <td className="td-action">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onToggleLock(p.id)}
                          className={`icon-btn ${p.isLocked ? 'icon-btn-locked' : 'icon-btn-idle'}`}
                          title={p.isLocked ? 'Unlock athlete' : 'Lock athlete into 100% of lineups'}
                        >
                          <Lock size={13} />
                        </button>
                        <button
                          onClick={() => onToggleExclude(p.id)}
                          className={`icon-btn ${p.isExcluded ? 'icon-btn-excluded' : 'icon-btn-idle'}`}
                          title={p.isExcluded ? 'Re-enable athlete' : 'Fade athlete completely (0% exposure)'}
                        >
                          <Ban size={13} />
                        </button>
                      </div>
                    </td>

                    {/* Athlete Profile: Headshot Avatar + Name + Subtitle */}
                    <td>
                      <div className="player-cell-wrap">
                        <AthleteAvatar
                          src={p.avatarUrl}
                          name={p.name}
                          team={p.team}
                          sport={currentSport}
                          size="md"
                        />
                        <div className="player-meta-box">
                          <div className="player-meta-name-row">
                            <span className="player-name">
                              {p.name}
                            </span>
                            {p.isLocked && <span className="badge-lock">LOCKED</span>}
                            {p.isExcluded && <span className="badge-exclude">FADED</span>}
                            {p.boost !== 0 && (
                              <span className={`badge-boost ${p.boost > 0 ? 'boost-pos' : 'boost-neg'}`}>
                                {p.boost > 0 ? `+${p.boost}` : p.boost}
                              </span>
                            )}
                          </div>
                          <div className="player-meta-sub-row">
                            {p.team && (
                              <span className="team-pill inline-flex items-center gap-1">
                                <TeamLogo team={p.team} size={13} />
                                <span>{p.team}</span>
                              </span>
                            )}
                            {p.opponent && (
                              <span className="opponent-text">vs {p.opponent}</span>
                            )}
                            {p.gameInfo && (
                              <span className="bout-text">{p.gameInfo}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* NBA Positions */}
                    {currentSport === 'nba' && (
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {p.positions?.map(pos => (
                            <span key={pos} className="pos-tag">{pos}</span>
                          ))}
                        </div>
                      </td>
                    )}

                    {/* Salary */}
                    <td className="text-right font-mono font-bold text-zinc-200 tabular-nums">
                      ${p.salary.toLocaleString()}
                    </td>

                    {/* Effective Projection + Boost controls */}
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => onUpdateBoost(p.id, -0.5)}
                          className="boost-step-btn"
                          title="Reduce projection -0.5"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="font-mono font-bold text-blue-400 text-sm tabular-nums w-12 text-center">
                          {effectiveProj.toFixed(1)}
                        </span>
                        <button 
                          onClick={() => onUpdateBoost(p.id, 0.5)}
                          className="boost-step-btn"
                          title="Increase projection +0.5"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </td>

                    {/* Value Ratio */}
                    <td className="text-right">
                      <span className={`value-badge tabular-nums ${isHighValue ? 'value-high' : 'value-mid'}`}>
                        {valueRatio}x
                      </span>
                    </td>

                    {/* Ownership */}
                    <td className="text-right font-mono text-xs text-zinc-400 tabular-nums">
                      {p.projectedOwnership ? `${p.projectedOwnership.toFixed(1)}%` : '—'}
                    </td>

                    {/* Max Exposure Input */}
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={p.maxExposure ?? 100}
                          onChange={e => onUpdateMaxExp(p.id, Number(e.target.value))}
                          className="max-exp-input font-mono text-xs"
                          disabled={p.isExcluded}
                        />
                        <span className="text-[11px] text-zinc-500 font-mono">%</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer Summary */}
      <div className="table-footer">
        <span className="text-xs text-zinc-400">
          Showing <strong className="text-zinc-200">{filteredAndSortedPlayers.length}</strong> of {players.length} athletes
        </span>
        <div className="flex items-center gap-4 text-xs text-zinc-400">
          <span>Avg Salary: <strong className="text-zinc-200 font-mono">${avgSalary.toLocaleString()}</strong></span>
          <span>Locked: <strong className="text-emerald-400 font-mono">{lockedCount}</strong></span>
          <span>Faded: <strong className="text-rose-400 font-mono">{excludedCount}</strong></span>
        </div>
      </div>
    </div>
  );
}
