// Client-side API connector to the Django REST framework backend
// Communicates with Django endpoints: /api/slates/, /api/optimize/, /api/lineups/

const DJANGO_BASE_URL = 'http://localhost:8000/api';

/**
 * Health check to verify if the Django REST backend server is currently running.
 */
export async function checkDjangoBackend() {
  if (typeof window === 'undefined' || (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')) {
    return false;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(`${DJANGO_BASE_URL}/slates/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Sends current player pool and optimizer settings to Django's Python solver
 */
export async function optimizeWithDjangoBackend(sport, players, settings) {
  const payload = {
    sport: sport.toUpperCase(),
    salary_cap: 50000,
    roster_size: sport === 'nba' ? 8 : 6,
    lineup_count: settings.numLineups || 20,
    strategy: settings.strategy || 'Max Projection',
    max_overlap: settings.maxOverlap || 4,
    players: players.map(p => ({
      id: p.id,
      name: p.name,
      team: p.team || '',
      positions: p.positions || ['UTIL'],
      salary: p.salary,
      projection: Number(p.projection || 0) + Number(p.boost || 0),
      is_locked: !!p.isLocked,
      is_excluded: !!p.isExcluded,
      max_exposure: p.maxExposure || 100,
      avatar_url: p.avatarUrl || ''
    }))
  };

  const res = await fetch(`${DJANGO_BASE_URL}/optimize/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Django API returned error ${res.status}`);
  }

  const data = await res.json();
  return {
    lineups: data.lineups.map(l => ({
      ...l,
      totalSalary: l.total_salary,
      totalProjection: l.total_projection
    })),
    playerAppearances: data.player_appearances || {},
    warning: data.warning || null
  };
}
