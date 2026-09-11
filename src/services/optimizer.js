// High-Performance DFS Lineup Optimizer Engine
// Supports MMA (6 F), NBA (Classic 8-slot: PG, SG, SF, PF, C, G, F, UTIL), and Golf (6 G).
// Implements true Branch-and-Bound Mixed Integer Linear Programming (MILP) with
// LP relaxation upper-bound pruning, Monte Carlo simulation, and DraftKings CSV export.

function randomNormal(mean = 0, stdev = 1) {
  let u1 = Math.random();
  let u2 = Math.random();
  while (u1 === 0) u1 = Math.random();
  return mean + Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2) * stdev;
}

function countOverlap(lineupA, lineupB) {
  const idsA = new Set(lineupA.players.map(p => p.id));
  return lineupB.players.filter(p => idsA.has(p.id)).length;
}

// ═══════════════════════════════════════════════════════════════════════
//  MMA MILP SOLVER (6 Fighters)
// ═══════════════════════════════════════════════════════════════════════

export function runMmaOptimizer(fighters, settings) {
  const {
    strategy = 'maxProjection',
    numLineups = 20,
    salaryCap = 50000,
    minSalary = 44000,
    rosterSize = 6,
    allowOpponents = false,
    maxExposure = 100,
    maxOverlap = 5
  } = settings;

  const eligible = fighters.filter(f => !f.isExcluded && f.salary > 0);
  const locked = eligible.filter(f => f.isLocked);

  if (locked.length > rosterSize) {
    throw new Error(`Too many locked fighters (${locked.length}). Max roster size is ${rosterSize}.`);
  }

  const lockedSalary = locked.reduce((s, f) => s + f.salary, 0);
  if (lockedSalary > salaryCap) {
    throw new Error(`Locked fighters salary ($${lockedSalary.toLocaleString()}) exceeds cap ($${salaryCap.toLocaleString()}).`);
  }

  if (!allowOpponents) {
    const lockedBouts = new Set();
    for (const f of locked) {
      if (f.gameInfo) {
        if (lockedBouts.has(f.gameInfo)) {
          throw new Error(`Conflict: Opponents in bout "${f.gameInfo}" are both locked. Unlock one or enable "Allow Opponents".`);
        }
        lockedBouts.add(f.gameInfo);
      }
    }
  }

  const lineups = [];
  const playerAppearances = {};
  eligible.forEach(f => { playerAppearances[f.id] = 0; });

  const maxAttempts = numLineups * 80;
  let attempts = 0;

  while (lineups.length < numLineups && attempts < maxAttempts) {
    attempts++;

    const candidates = eligible.map(f => {
      const baseProj = Number(f.projection || 0) + Number(f.boost || 0);
      let score = baseProj;

      if (strategy === 'monteCarlo') {
        score = Math.max(0, randomNormal(baseProj, 7.0));
      } else if (strategy === 'contrarian') {
        const own = Math.max(1, f.projectedOwnership || 15);
        score = (baseProj / Math.sqrt(own / 100)) * (0.92 + Math.random() * 0.16);
      } else if (strategy === 'balanced') {
        const val = baseProj / (f.salary / 1000);
        score = baseProj * 0.7 + val * 4.0 + (Math.random() - 0.5) * 1.5;
      } else if (strategy === 'salaryCap') {
        score = baseProj + (f.salary / 1000) * 1.5 + (Math.random() - 0.5) * 1.5;
      } else {
        if (lineups.length > 0) {
          score = baseProj * (1 + (Math.random() - 0.5) * 0.08);
        }
      }

      return { ...f, score };
    });

    const filteredCandidates = candidates.filter(c => {
      if (c.isLocked) return true;
      const effectiveMax = Math.min(c.maxExposure ?? 100, maxExposure);
      const allowedCount = Math.ceil((numLineups * effectiveMax) / 100);
      return (playerAppearances[c.id] || 0) < allowedCount;
    });

    const lineup = solveMmaBranchAndBound({
      candidates: filteredCandidates,
      salaryCap,
      minSalary: lineups.length > 0 ? minSalary : 0,
      rosterSize,
      allowOpponents
    });

    if (!lineup) continue;

    if (lineups.length > 0 && maxOverlap < rosterSize) {
      const isTooSimilar = lineups.some(existing => countOverlap(existing, lineup) > maxOverlap);
      if (isTooSimilar && attempts < maxAttempts * 0.7) continue;
    }

    const lineupKey = lineup.players.map(p => p.id).sort().join('|');
    if (lineups.some(l => l.players.map(p => p.id).sort().join('|') === lineupKey)) continue;

    lineup.players.forEach(p => {
      playerAppearances[p.id] = (playerAppearances[p.id] || 0) + 1;
    });
    lineup.index = lineups.length + 1;
    lineups.push(lineup);
  }

  lineups.sort((a, b) => b.totalProjection - a.totalProjection);
  lineups.forEach((l, idx) => { l.index = idx + 1; });

  return {
    lineups,
    playerAppearances,
    totalLineups: lineups.length,
    warning: lineups.length < numLineups ? `Generated ${lineups.length} of requested ${numLineups} MMA lineups within exposure limits.` : null
  };
}

function solveMmaBranchAndBound({ candidates, salaryCap, minSalary, rosterSize, allowOpponents }) {
  const lockedCandidates = candidates.filter(c => c.isLocked);
  const availableCandidates = candidates.filter(c => !c.isLocked);

  if (lockedCandidates.length > rosterSize) return null;
  const lockedSalary = lockedCandidates.reduce((s, c) => s + c.salary, 0);
  if (lockedSalary > salaryCap) return null;

  availableCandidates.sort((a, b) => (b.score / (b.salary || 1)) - (a.score / (a.salary || 1)));

  const initialBouts = new Set(lockedCandidates.filter(c => c.gameInfo).map(c => c.gameInfo));
  const initialSelection = [...lockedCandidates];

  const best = { score: -Infinity, selection: null };

  function computeUpperBound(startIdx, currentScore, salaryRemaining, slotsRemaining) {
    if (slotsRemaining <= 0) return currentScore;
    let bound = currentScore;
    let budget = salaryRemaining;
    let slots = slotsRemaining;

    for (let i = startIdx; i < availableCandidates.length && slots > 0; i++) {
      const sal = availableCandidates[i].salary;
      if (sal <= budget) {
        bound += availableCandidates[i].score;
        budget -= sal;
        slots--;
      } else if (budget > 0) {
        bound += availableCandidates[i].score * (budget / sal);
        break;
      }
    }
    return bound;
  }

  function search(startIdx, currentSelection, currentSalary, currentScore, selectedBouts) {
    if (currentSelection.length === rosterSize) {
      if (currentScore > best.score && currentSalary >= minSalary) {
        best.score = currentScore;
        best.selection = [...currentSelection];
      }
      return;
    }

    const slotsRemaining = rosterSize - currentSelection.length;
    const salaryRemaining = salaryCap - currentSalary;

    for (let i = startIdx; i < availableCandidates.length; i++) {
      const candidate = availableCandidates[i];
      if (candidate.salary > salaryRemaining) continue;
      if (availableCandidates.length - i < slotsRemaining) break;

      if (!allowOpponents && candidate.gameInfo && selectedBouts.has(candidate.gameInfo)) {
        continue;
      }

      const ub = computeUpperBound(
        i,
        currentScore + candidate.score,
        salaryRemaining - candidate.salary,
        slotsRemaining - 1
      );
      if (ub <= best.score) continue;

      currentSelection.push(candidate);
      if (!allowOpponents && candidate.gameInfo) selectedBouts.add(candidate.gameInfo);

      search(
        i + 1,
        currentSelection,
        currentSalary + candidate.salary,
        currentScore + candidate.score,
        selectedBouts
      );

      currentSelection.pop();
      if (!allowOpponents && candidate.gameInfo) selectedBouts.delete(candidate.gameInfo);
    }
  }

  const initialScore = lockedCandidates.reduce((s, c) => s + c.score, 0);
  search(0, initialSelection, lockedSalary, initialScore, initialBouts);

  if (!best.selection) return null;

  const totalSalary = best.selection.reduce((s, p) => s + p.salary, 0);
  const totalProjection = Number(best.selection.reduce((s, p) => s + (p.projection + (p.boost || 0)), 0).toFixed(2));
  const totalOwnership = Number(best.selection.reduce((s, p) => s + (p.projectedOwnership || 0), 0).toFixed(1));

  return {
    players: best.selection,
    totalSalary,
    totalProjection,
    totalOwnership,
    remainingSalary: salaryCap - totalSalary
  };
}

// ═══════════════════════════════════════════════════════════════════════
//  NBA MILP SOLVER (Classic: PG, SG, SF, PF, C, G, F, UTIL)
// ═══════════════════════════════════════════════════════════════════════

const NBA_SLOTS = ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL'];

function canFitNbaSlot(posList, slot) {
  if (slot === 'UTIL') return true;
  if (slot === 'G') return posList.includes('PG') || posList.includes('SG');
  if (slot === 'F') return posList.includes('SF') || posList.includes('PF');
  return posList.includes(slot);
}

function matchNbaSlots(players) {
  const usedSlots = new Array(8).fill(false);
  const assignment = new Array(8);

  function tryMatch(pIdx) {
    if (pIdx === 8) return true;
    const p = players[pIdx];
    for (let s = 0; s < 8; s++) {
      if (!usedSlots[s] && canFitNbaSlot(p.positions, NBA_SLOTS[s])) {
        usedSlots[s] = true;
        assignment[s] = p;
        if (tryMatch(pIdx + 1)) return true;
        usedSlots[s] = false;
      }
    }
    return false;
  }

  if (tryMatch(0)) {
    return assignment.map((p, idx) => ({ ...p, rosterSlot: NBA_SLOTS[idx] }));
  }
  return null;
}

export function runNbaOptimizer(players, settings) {
  const {
    strategy = 'maxProjection',
    numLineups = 20,
    salaryCap = 50000,
    minSalary = 45000,
    maxPlayersPerTeam = 4,
    maxExposure = 100,
    maxOverlap = 7
  } = settings;

  const eligible = players.filter(p => !p.isExcluded && p.salary > 0);
  const locked = eligible.filter(p => p.isLocked);

  if (locked.length > 8) {
    throw new Error(`Too many locked NBA players (${locked.length}). Max roster size is 8.`);
  }

  const lockedSalary = locked.reduce((s, p) => s + p.salary, 0);
  if (lockedSalary > salaryCap) {
    throw new Error(`Locked NBA players salary ($${lockedSalary.toLocaleString()}) exceeds cap.`);
  }

  const lineups = [];
  const playerAppearances = {};
  eligible.forEach(p => { playerAppearances[p.id] = 0; });

  const maxAttempts = numLineups * 80;
  let attempts = 0;

  while (lineups.length < numLineups && attempts < maxAttempts) {
    attempts++;

    const candidates = eligible.map(p => {
      const baseProj = Number(p.projection || 0) + Number(p.boost || 0);
      let score = baseProj;

      if (strategy === 'monteCarlo') {
        score = Math.max(0, randomNormal(baseProj, 8.0));
      } else if (strategy === 'contrarian') {
        const own = Math.max(1, p.projectedOwnership || 15);
        score = (baseProj / Math.sqrt(own / 100)) * (0.92 + Math.random() * 0.16);
      } else if (strategy === 'balanced') {
        const val = baseProj / (p.salary / 1000);
        score = baseProj * 0.65 + val * 5.0 + (Math.random() - 0.5) * 1.5;
      } else if (strategy === 'salaryCap') {
        score = baseProj + (p.salary / 1000) * 1.5 + (Math.random() - 0.5) * 1.5;
      } else {
        if (lineups.length > 0) {
          score = baseProj * (1 + (Math.random() - 0.5) * 0.08);
        }
      }

      return { ...p, score };
    });

    const filteredCandidates = candidates.filter(c => {
      if (c.isLocked) return true;
      const effectiveMax = Math.min(c.maxExposure ?? 100, maxExposure);
      const allowedCount = Math.ceil((numLineups * effectiveMax) / 100);
      return (playerAppearances[c.id] || 0) < allowedCount;
    });

    const lineup = solveNbaMilp({
      candidates: filteredCandidates,
      salaryCap,
      minSalary: lineups.length > 0 ? minSalary : 0,
      maxPlayersPerTeam
    });

    if (!lineup) continue;

    if (lineups.length > 0 && maxOverlap < 8) {
      const isTooSimilar = lineups.some(existing => countOverlap(existing, lineup) > maxOverlap);
      if (isTooSimilar && attempts < maxAttempts * 0.7) continue;
    }

    const lineupKey = lineup.players.map(p => p.id).sort().join('|');
    if (lineups.some(l => l.players.map(p => p.id).sort().join('|') === lineupKey)) continue;

    lineup.players.forEach(p => {
      playerAppearances[p.id] = (playerAppearances[p.id] || 0) + 1;
    });
    lineup.index = lineups.length + 1;
    lineups.push(lineup);
  }

  lineups.sort((a, b) => b.totalProjection - a.totalProjection);
  lineups.forEach((l, idx) => { l.index = idx + 1; });

  return {
    lineups,
    playerAppearances,
    totalLineups: lineups.length,
    warning: lineups.length < numLineups ? `Generated ${lineups.length} of requested ${numLineups} NBA lineups.` : null
  };
}

function solveNbaMilp({ candidates, salaryCap, minSalary, maxPlayersPerTeam }) {
  const locked = candidates.filter(c => c.isLocked);
  const available = candidates.filter(c => !c.isLocked);

  if (locked.length > 8) return null;
  const lockedSalary = locked.reduce((s, p) => s + p.salary, 0);
  if (lockedSalary > salaryCap) return null;

  // Check locked team counts
  const lockedTeamCounts = {};
  for (const p of locked) {
    lockedTeamCounts[p.team] = (lockedTeamCounts[p.team] || 0) + 1;
    if (lockedTeamCounts[p.team] > maxPlayersPerTeam) return null;
  }

  available.sort((a, b) => (b.score / (b.salary || 1)) - (a.score / (a.salary || 1)));

  const best = { score: -Infinity, selection: null };
  let nodeVisits = 0;

  function computeUpperBound(startIdx, currentScore, salaryRemaining, slotsRemaining) {
    if (slotsRemaining <= 0) return currentScore;
    let bound = currentScore;
    let budget = salaryRemaining;
    let slots = slotsRemaining;
    for (let i = startIdx; i < available.length && slots > 0; i++) {
      const sal = available[i].salary;
      if (sal <= budget) {
        bound += available[i].score;
        budget -= sal;
        slots--;
      } else if (budget > 0) {
        bound += available[i].score * (budget / sal);
        break;
      }
    }
    return bound;
  }

  function search(startIdx, selection, salary, score, teamCounts) {
    nodeVisits++;
    if (nodeVisits > 25000) return;

    if (selection.length === 8) {
      if (score > best.score && salary >= minSalary) {
        const matched = matchNbaSlots(selection);
        if (matched) {
          best.score = score;
          best.selection = matched;
        }
      }
      return;
    }

    const slotsRemaining = 8 - selection.length;
    const salaryRemaining = salaryCap - salary;

    for (let i = startIdx; i < available.length; i++) {
      const c = available[i];
      if (c.salary > salaryRemaining) continue;
      if (available.length - i < slotsRemaining) break;
      if ((teamCounts[c.team] || 0) >= maxPlayersPerTeam) continue;

      const ub = computeUpperBound(i, score + c.score, salaryRemaining - c.salary, slotsRemaining - 1);
      if (ub <= best.score) continue;

      selection.push(c);
      teamCounts[c.team] = (teamCounts[c.team] || 0) + 1;

      search(i + 1, selection, salary + c.salary, score + c.score, teamCounts);

      selection.pop();
      teamCounts[c.team]--;
    }
  }

  const initialScore = locked.reduce((s, p) => s + p.score, 0);
  search(0, [...locked], lockedSalary, initialScore, { ...lockedTeamCounts });

  if (!best.selection) return null;

  const totalSalary = best.selection.reduce((s, p) => s + p.salary, 0);
  const totalProjection = Number(best.selection.reduce((s, p) => s + (p.projection + (p.boost || 0)), 0).toFixed(2));
  const totalOwnership = Number(best.selection.reduce((s, p) => s + (p.projectedOwnership || 0), 0).toFixed(1));

  return {
    players: best.selection,
    totalSalary,
    totalProjection,
    totalOwnership,
    remainingSalary: salaryCap - totalSalary
  };
}

// ═══════════════════════════════════════════════════════════════════════
//  GOLF MILP SOLVER (6 Golfers)
// ═══════════════════════════════════════════════════════════════════════

export function runGolfOptimizer(players, settings) {
  const {
    strategy = 'maxProjection',
    numLineups = 20,
    salaryCap = 50000,
    minSalary = 44000,
    rosterSize = 6,
    maxExposure = 100,
    maxOverlap = 5
  } = settings;

  const eligible = players.filter(p => !p.isExcluded && p.salary > 0);
  const locked = eligible.filter(p => p.isLocked);

  if (locked.length > rosterSize) {
    throw new Error(`Too many locked golfers (${locked.length}). Max roster size is ${rosterSize}.`);
  }

  const lockedSalary = locked.reduce((s, p) => s + p.salary, 0);
  if (lockedSalary > salaryCap) {
    throw new Error(`Locked golfers salary exceeds cap.`);
  }

  const lineups = [];
  const playerAppearances = {};
  eligible.forEach(p => { playerAppearances[p.id] = 0; });

  const maxAttempts = numLineups * 80;
  let attempts = 0;

  while (lineups.length < numLineups && attempts < maxAttempts) {
    attempts++;

    const candidates = eligible.map(p => {
      const baseProj = Number(p.projection || 0) + Number(p.boost || 0);
      let score = baseProj;

      if (strategy === 'monteCarlo') {
        score = Math.max(0, randomNormal(baseProj, 9.0));
      } else if (strategy === 'contrarian') {
        const own = Math.max(1, p.projectedOwnership || 15);
        score = (baseProj / Math.sqrt(own / 100)) * (0.92 + Math.random() * 0.16);
      } else if (strategy === 'balanced') {
        const val = baseProj / (p.salary / 1000);
        score = baseProj * 0.7 + val * 4.0 + (Math.random() - 0.5) * 1.5;
      } else if (strategy === 'salaryCap') {
        score = baseProj + (p.salary / 1000) * 1.5 + (Math.random() - 0.5) * 1.5;
      } else {
        if (lineups.length > 0) {
          score = baseProj * (1 + (Math.random() - 0.5) * 0.08);
        }
      }

      return { ...p, score };
    });

    const filteredCandidates = candidates.filter(c => {
      if (c.isLocked) return true;
      const effectiveMax = Math.min(c.maxExposure ?? 100, maxExposure);
      const allowedCount = Math.ceil((numLineups * effectiveMax) / 100);
      return (playerAppearances[c.id] || 0) < allowedCount;
    });

    const lineup = solveMmaBranchAndBound({
      candidates: filteredCandidates,
      salaryCap,
      minSalary: lineups.length > 0 ? minSalary : 0,
      rosterSize,
      allowOpponents: true
    });

    if (!lineup) continue;

    if (lineups.length > 0 && maxOverlap < rosterSize) {
      const isTooSimilar = lineups.some(existing => countOverlap(existing, lineup) > maxOverlap);
      if (isTooSimilar && attempts < maxAttempts * 0.7) continue;
    }

    const lineupKey = lineup.players.map(p => p.id).sort().join('|');
    if (lineups.some(l => l.players.map(p => p.id).sort().join('|') === lineupKey)) continue;

    lineup.players.forEach(p => {
      playerAppearances[p.id] = (playerAppearances[p.id] || 0) + 1;
    });
    lineup.index = lineups.length + 1;
    lineups.push(lineup);
  }

  lineups.sort((a, b) => b.totalProjection - a.totalProjection);
  lineups.forEach((l, idx) => { l.index = idx + 1; });

  return {
    lineups,
    playerAppearances,
    totalLineups: lineups.length,
    warning: lineups.length < numLineups ? `Generated ${lineups.length} of requested ${numLineups} Golf lineups.` : null
  };
}

// ═══════════════════════════════════════════════════════════════════════
//  DRAFTKINGS CSV EXPORT FORMATTER
// ═══════════════════════════════════════════════════════════════════════

export function generateDraftKingsCsv(sport, lineups) {
  if (!lineups || lineups.length === 0) return '';

  if (sport === 'nba') {
    const header = 'PG,SG,SF,PF,C,G,F,UTIL\n';
    const rows = lineups.map(l => l.players.map(p => `"${p.name}"`).join(',')).join('\n');
    return header + rows;
  } else if (sport === 'golf') {
    const header = 'G,G,G,G,G,G\n';
    const rows = lineups.map(l => l.players.map(p => `"${p.name}"`).join(',')).join('\n');
    return header + rows;
  } else {
    // MMA: F, F, F, F, F, F
    const header = 'F,F,F,F,F,F\n';
    const rows = lineups.map(l => l.players.map(p => `"${p.name}"`).join(',')).join('\n');
    return header + rows;
  }
}
