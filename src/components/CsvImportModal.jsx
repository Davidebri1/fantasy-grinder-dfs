import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export default function CsvImportModal({ 
  isOpen, 
  onClose, 
  currentSport, 
  onImportPlayers 
}) {
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedPreview, setParsedPreview] = useState(null);
  const [error, setError] = useState(null);
  const [replaceExisting, setReplaceExisting] = useState(true);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setCsvText(content);
        parseCsv(content);
      }
    };
    reader.onerror = () => setError('Failed to read file.');
    reader.readAsText(file);
  };

  const parseCsv = (text) => {
    try {
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        throw new Error('CSV file must have a header row and at least one player row.');
      }

      // Parse headers
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
      
      const nameIdx = headers.findIndex(h => h === 'name' || h === 'player name');
      const salaryIdx = headers.findIndex(h => h === 'salary');
      const posIdx = headers.findIndex(h => h === 'position' || h === 'pos' || h === 'roster position');
      const gameIdx = headers.findIndex(h => h === 'game info' || h === 'game' || h === 'matchup');
      const teamIdx = headers.findIndex(h => h === 'teamabbrev' || h === 'team');
      const projIdx = headers.findIndex(h => h === 'avgpointspergame' || h === 'projection' || h === 'fpts' || h === 'avg');

      if (nameIdx === -1 || salaryIdx === -1) {
        throw new Error('CSV must contain "Name" and "Salary" columns.');
      }

      const players = [];
      for (let i = 1; i < lines.length; i++) {
        // Regex to handle commas inside quotes
        const cols = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
        const cleanCols = cols.map(c => c.trim().replace(/^"|"$/g, ''));

        const name = cleanCols[nameIdx];
        const salary = parseInt(cleanCols[salaryIdx]?.replace(/[$,]/g, '') || '0');
        if (!name || isNaN(salary) || salary <= 0) continue;

        let positions = [];
        if (posIdx !== -1 && cleanCols[posIdx]) {
          positions = cleanCols[posIdx].split(/[/]/).map(p => p.trim());
        } else {
          positions = currentSport === 'nba' ? ['UTIL'] : currentSport === 'golf' ? ['G'] : ['F'];
        }

        const gameInfo = gameIdx !== -1 ? (cleanCols[gameIdx] || '') : '';
        const team = teamIdx !== -1 ? (cleanCols[teamIdx] || '') : '';
        const projection = projIdx !== -1 ? parseFloat(cleanCols[projIdx] || '0') : (salary / 250);

        players.push({
          id: `${currentSport}-csv-${i}-${Date.now()}`,
          name,
          salary,
          positions,
          team,
          gameInfo,
          projection: Number(projection.toFixed(1)),
          projectedOwnership: Number((15.0 + (projection / (salary / 1000)) * 2).toFixed(1)),
          isLocked: false,
          isExcluded: false,
          minExposure: 0,
          maxExposure: 100,
          boost: 0
        });
      }

      if (players.length === 0) {
        throw new Error('No valid players could be extracted from this CSV file.');
      }

      setParsedPreview(players);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to parse CSV file.');
      setParsedPreview(null);
    }
  };

  const handleConfirm = () => {
    if (!parsedPreview || parsedPreview.length === 0) return;
    onImportPlayers(parsedPreview, replaceExisting);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Upload size={20} className="text-blue-400" />
            <h2 className="modal-title">Import {currentSport.toUpperCase()} DraftKings CSV</h2>
          </div>
          <button onClick={onClose} className="modal-close-btn">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-toast" style={{ margin: '0 0 12px 0' }}>
              <AlertCircle size={16} className="text-rose-400 shrink-0" />
              <span className="text-sm text-rose-200">{error}</span>
            </div>
          )}

          {/* File selector zone */}
          <div className="form-section">
            <label className="section-label">Select DraftKings Contest CSV File</label>
            <div 
              style={{
                border: '2px dashed var(--border-strong)',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
                background: 'rgba(11, 15, 25, 0.4)',
                cursor: 'pointer'
              }}
              onClick={() => document.getElementById('csvFileInput')?.click()}
            >
              <FileText size={32} className="text-blue-400" style={{ margin: '0 auto 8px auto' }} />
              <div className="text-sm font-semibold text-white">
                {fileName ? fileName : 'Click to browse or drop DraftKings CSV here'}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Compatible with DraftKings player pool exports (Name, Salary, Pos, Game Info)
              </div>
              <input 
                id="csvFileInput"
                type="file" 
                accept=".csv" 
                onChange={handleFileUpload} 
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* Preview summary if parsed */}
          {parsedPreview && (
            <div className="form-section">
              <div className="flex items-center justify-between">
                <span className="section-label text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  Successfully Detected {parsedPreview.length} Athletes
                </span>
                <span className="text-xs font-mono text-gray-400">
                  Salaries: ${Math.min(...parsedPreview.map(p => p.salary)).toLocaleString()} – ${Math.max(...parsedPreview.map(p => p.salary)).toLocaleString()}
                </span>
              </div>

              <div style={{
                maxHeight: '180px',
                overflowY: 'auto',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '8px 12px'
              }}>
                <table style={{ width: '100%', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '4px' }}>Athlete</th>
                      {currentSport === 'nba' && <th style={{ padding: '4px' }}>Pos</th>}
                      <th style={{ padding: '4px', textAlign: 'right' }}>Salary</th>
                      <th style={{ padding: '4px', textAlign: 'right' }}>Proj</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedPreview.slice(0, 8).map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '4px', color: '#fff', fontWeight: '600' }}>{p.name}</td>
                        {currentSport === 'nba' && <td style={{ padding: '4px', color: '#60a5fa' }}>{p.positions.join('/')}</td>}
                        <td style={{ padding: '4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>${p.salary.toLocaleString()}</td>
                        <td style={{ padding: '4px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#93c5fd' }}>{p.projection}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedPreview.length > 8 && (
                  <div className="text-xs text-center text-gray-400 mt-2">
                    ...and {parsedPreview.length - 8} more athletes ready to import
                  </div>
                )}
              </div>

              {/* Import Mode Toggle */}
              <div style={{ marginTop: '10px' }} className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                  <input 
                    type="radio" 
                    name="importMode" 
                    checked={replaceExisting} 
                    onChange={() => setReplaceExisting(true)}
                  />
                  <span>Replace current pool with this CSV</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                  <input 
                    type="radio" 
                    name="importMode" 
                    checked={!replaceExisting} 
                    onChange={() => setReplaceExisting(false)}
                  />
                  <span>Merge with existing pool</span>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button 
            onClick={handleConfirm} 
            disabled={!parsedPreview || parsedPreview.length === 0}
            className="btn-primary"
          >
            <CheckCircle2 size={16} />
            <span>Confirm & Import ({parsedPreview?.length || 0} Players)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
