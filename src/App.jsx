import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SportOverview from './components/SportOverview';
import PlayerTable from './components/PlayerTable';
import LineupPanel from './components/LineupPanel';
import RulesModal from './components/RulesModal';
import CsvImportModal from './components/CsvImportModal';
import { 
  SAMPLE_MMA_FIGHTERS, 
  SAMPLE_NBA_PLAYERS, 
  SAMPLE_GOLF_PLAYERS 
} from './services/sampleData';
import { 
  runMmaOptimizer, 
  runNbaOptimizer, 
  runGolfOptimizer,
  generateDraftKingsCsv 
} from './services/optimizer';
import { Sparkles, Layers, Sliders, Database, AlertCircle } from 'lucide-react';
import { checkDjangoBackend, optimizeWithDjangoBackend } from './services/api';
import './App.css';

export default function App() {
  const [currentSport, setCurrentSport] = useState('overview'); // 'overview' | 'mma' | 'nba' | 'golf'
  const [sportViewTab, setSportViewTab] = useState('pool'); // 'pool' | 'lineups'
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [engineMode, setEngineMode] = useState('client'); // 'client' | 'django'
  const [djangoOnline, setDjangoOnline] = useState(false);

  // Check Django Backend connectivity on mount
  useEffect(() => {
    checkDjangoBackend().then(isLive => setDjangoOnline(isLive));
    const timer = setInterval(() => {
      checkDjangoBackend().then(isLive => setDjangoOnline(isLive));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Player pools initialized with sample slates
  const [mmaPlayers, setMmaPlayers] = useState(SAMPLE_MMA_FIGHTERS);
  const [nbaPlayers, setNbaPlayers] = useState(SAMPLE_NBA_PLAYERS);
  const [golfPlayers, setGolfPlayers] = useState(SAMPLE_GOLF_PLAYERS);

  // Optimizer Settings per sport
  const [mmaSettings, setMmaSettings] = useState({
    strategy: 'maxProjection',
    numLineups: 20,
    salaryCap: 50000,
    minSalary: 48000,
    rosterSize: 6,
    allowOpponents: false,
    maxExposure: 100,
    maxOverlap: 4
  });

  const [nbaSettings, setNbaSettings] = useState({
    strategy: 'maxProjection',
    numLineups: 20,
    salaryCap: 50000,
    minSalary: 48500,
    maxPlayersPerTeam: 4,
    maxExposure: 100,
    maxOverlap: 6
  });

  const [golfSettings, setGolfSettings] = useState({
    strategy: 'maxProjection',
    numLineups: 20,
    salaryCap: 50000,
    minSalary: 48000,
    rosterSize: 6,
    maxExposure: 100,
    maxOverlap: 4
  });

  // Generated Results
  const [mmaResults, setMmaResults] = useState({ lineups: [], playerAppearances: {}, warning: null });
  const [nbaResults, setNbaResults] = useState({ lineups: [], playerAppearances: {}, warning: null });
  const [golfResults, setGolfResults] = useState({ lineups: [], playerAppearances: {}, warning: null });

  // Getters for current active sport
  const getCurrentPool = () => {
    if (currentSport === 'mma') return mmaPlayers;
    if (currentSport === 'nba') return nbaPlayers;
    if (currentSport === 'golf') return golfPlayers;
    return [];
  };

  const getCurrentSettings = () => {
    if (currentSport === 'mma') return mmaSettings;
    if (currentSport === 'nba') return nbaSettings;
    if (currentSport === 'golf') return golfSettings;
    return {};
  };

  const setCurrentSettings = (setter) => {
    if (currentSport === 'mma') setMmaSettings(setter);
    else if (currentSport === 'nba') setNbaSettings(setter);
    else if (currentSport === 'golf') setGolfSettings(setter);
  };

  const getCurrentResults = () => {
    if (currentSport === 'mma') return mmaResults;
    if (currentSport === 'nba') return nbaResults;
    if (currentSport === 'golf') return golfResults;
    return { lineups: [], playerAppearances: {}, warning: null };
  };

  const updateCurrentPool = (updater) => {
    if (currentSport === 'mma') setMmaPlayers(updater);
    else if (currentSport === 'nba') setNbaPlayers(updater);
    else if (currentSport === 'golf') setGolfPlayers(updater);
  };

  // Lock toggle
  const handleToggleLock = (id) => {
    updateCurrentPool(prev => prev.map(p => {
      if (p.id === id) {
        const nextLock = !p.isLocked;
        return { ...p, isLocked: nextLock, isExcluded: nextLock ? false : p.isExcluded };
      }
      return p;
    }));
  };

  // Exclude toggle
  const handleToggleExclude = (id) => {
    updateCurrentPool(prev => prev.map(p => {
      if (p.id === id) {
        const nextExclude = !p.isExcluded;
        return { ...p, isExcluded: nextExclude, isLocked: nextExclude ? false : p.isLocked };
      }
      return p;
    }));
  };

  // Boost update
  const handleUpdateBoost = (id, delta) => {
    updateCurrentPool(prev => prev.map(p => {
      if (p.id === id) {
        const currentBoost = Number(p.boost || 0);
        return { ...p, boost: Number((currentBoost + delta).toFixed(1)) };
      }
      return p;
    }));
  };

  // Max Exposure update
  const handleUpdateMaxExp = (id, exp) => {
    updateCurrentPool(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, maxExposure: exp };
      }
      return p;
    }));
  };

  // Reset locks and exclusions
  const handleResetAll = () => {
    updateCurrentPool(prev => prev.map(p => ({
      ...p,
      isLocked: false,
      isExcluded: false,
      boost: 0,
      maxExposure: 100
    })));
  };

  // Load sample slate
  const handleLoadSample = () => {
    if (currentSport === 'mma') {
      setMmaPlayers(SAMPLE_MMA_FIGHTERS);
    } else if (currentSport === 'nba') {
      setNbaPlayers(SAMPLE_NBA_PLAYERS);
    } else if (currentSport === 'golf') {
      setGolfPlayers(SAMPLE_GOLF_PLAYERS);
    }
  };

  // Run Optimization (Dual-Engine: Django Python REST API or Client-Side Solver)
  const handleOptimize = async () => {
    setErrorMessage(null);
    setIsOptimizing(true);

    try {
      if (engineMode === 'django') {
        try {
          const result = await optimizeWithDjangoBackend(currentSport, getCurrentPool(), getCurrentSettings());
          if (currentSport === 'mma') setMmaResults(result);
          else if (currentSport === 'nba') setNbaResults(result);
          else if (currentSport === 'golf') setGolfResults(result);
          setSportViewTab('lineups');
          setIsOptimizing(false);
          return;
        } catch (apiErr) {
          console.warn('Django API not reachable, falling back to Client-Side Solver:', apiErr);
          setErrorMessage('Django backend unreachable on localhost:8000. Automatically fell back to Client-Side Solver.');
        }
      }

      // Client-Side solver execution
      setTimeout(() => {
        try {
          let result;
          if (currentSport === 'mma') {
            result = runMmaOptimizer(mmaPlayers, mmaSettings);
            setMmaResults(result);
          } else if (currentSport === 'nba') {
            result = runNbaOptimizer(nbaPlayers, nbaSettings);
            setNbaResults(result);
          } else if (currentSport === 'golf') {
            result = runGolfOptimizer(golfPlayers, golfSettings);
            setGolfResults(result);
          }
          setSportViewTab('lineups');
        } catch (err) {
          setErrorMessage(err.message || 'Optimization failed.');
        } finally {
          setIsOptimizing(false);
        }
      }, 150);
    } catch (err) {
      setErrorMessage(err.message || 'Optimization failed.');
      setIsOptimizing(false);
    }
  };

  // Clear lineups
  const handleClearLineups = () => {
    if (currentSport === 'mma') setMmaResults({ lineups: [], playerAppearances: {}, warning: null });
    else if (currentSport === 'nba') setNbaResults({ lineups: [], playerAppearances: {}, warning: null });
    else if (currentSport === 'golf') setGolfResults({ lineups: [], playerAppearances: {}, warning: null });
  };

  // Export DraftKings CSV
  const handleExportCsv = () => {
    const results = getCurrentResults();
    if (!results.lineups || results.lineups.length === 0) return;

    const csvContent = generateDraftKingsCsv(currentSport, results.lineups);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DK_${currentSport.toUpperCase()}_${results.lineups.length}_Lineups.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import CSV players handler
  const handleImportPlayers = (newPlayers, replace) => {
    if (replace) {
      updateCurrentPool(() => newPlayers);
    } else {
      updateCurrentPool(prev => {
        const existingNames = new Set(prev.map(p => p.name.toLowerCase()));
        const uniqueNew = newPlayers.filter(p => !existingNames.has(p.name.toLowerCase()));
        return [...prev, ...uniqueNew];
      });
    }
    handleClearLineups();
    setSportViewTab('pool');
  };

  const results = getCurrentResults();

  return (
    <div className="app-root">
      <Navbar
        currentSport={currentSport}
        setCurrentSport={setCurrentSport}
        onLoadSample={handleLoadSample}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenRules={() => setIsRulesOpen(true)}
        onOptimize={handleOptimize}
        isOptimizing={isOptimizing}
        onReset={handleResetAll}
        lineupCount={results.lineups.length}
        onExportCsv={handleExportCsv}
      />

      <main className="app-main">
        {errorMessage && (
          <div className="error-toast">
            <AlertCircle size={18} className="text-rose-400 shrink-0" />
            <span className="text-sm text-rose-200">{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="ml-auto text-xs text-rose-300">Dismiss</button>
          </div>
        )}

        {currentSport === 'overview' ? (
          <SportOverview onSelectSport={setCurrentSport} />
        ) : (
          <div className="sport-workspace">
            {/* Workspace Subheader Navigation */}
            <div className="workspace-subnav">
              <div className="flex items-center gap-4">
                <span className="sport-title-badge">
                  {currentSport === 'mma' ? '🥊 MMA / UFC' : currentSport === 'nba' ? '🏀 NBA Classic' : '⛳ PGA Golf'}
                </span>
                <span className="strategy-pill">
                  Strategy: <strong className="text-blue-400 uppercase">{getCurrentSettings().strategy}</strong>
                </span>
              </div>

              <div className="workspace-tabs">
                <button
                  onClick={() => setSportViewTab('pool')}
                  className={`subnav-tab ${sportViewTab === 'pool' ? 'active' : ''}`}
                >
                  <Database size={15} />
                  <span>Athletes Pool ({getCurrentPool().length})</span>
                </button>
                <button
                  onClick={() => setSportViewTab('lineups')}
                  className={`subnav-tab ${sportViewTab === 'lineups' ? 'active' : ''}`}
                >
                  <Layers size={15} />
                  <span>Generated Lineups ({results.lineups.length})</span>
                </button>
              </div>
            </div>

            {/* Tab content */}
            <div className="workspace-content">
              {sportViewTab === 'pool' ? (
                <PlayerTable
                  players={getCurrentPool()}
                  onToggleLock={handleToggleLock}
                  onToggleExclude={handleToggleExclude}
                  onUpdateBoost={handleUpdateBoost}
                  onUpdateMaxExp={handleUpdateMaxExp}
                  currentSport={currentSport}
                  onResetAll={handleResetAll}
                />
              ) : (
                <LineupPanel
                  lineups={results.lineups}
                  playerAppearances={results.playerAppearances}
                  totalLineups={results.totalLineups}
                  onExportCsv={handleExportCsv}
                  onClearLineups={handleClearLineups}
                  currentSport={currentSport}
                  warning={results.warning}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Rules Modal */}
      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
        settings={getCurrentSettings()}
        setSettings={setCurrentSettings}
        currentSport={currentSport}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        currentSport={currentSport}
        onImportPlayers={handleImportPlayers}
      />
    </div>
  );
}
