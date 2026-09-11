// Official database of team logos, colors, and metadata for team sports
// Auto-imported for NBA and expandable to NFL, MLB, NHL.
// Sourced from ESPN high-resolution transparent SVG/PNG CDN assets.

export const NBA_TEAMS = {
  ATL: { code: 'ATL', name: 'Atlanta Hawks', slug: 'atl', city: 'Atlanta', color: '#E03A3E' },
  BOS: { code: 'BOS', name: 'Boston Celtics', slug: 'bos', city: 'Boston', color: '#007A33' },
  BKN: { code: 'BKN', name: 'Brooklyn Nets', slug: 'bkn', city: 'Brooklyn', color: '#000000' },
  CHA: { code: 'CHA', name: 'Charlotte Hornets', slug: 'cha', city: 'Charlotte', color: '#1D1160' },
  CHI: { code: 'CHI', name: 'Chicago Bulls', slug: 'chi', city: 'Chicago', color: '#CE1141' },
  CLE: { code: 'CLE', name: 'Cleveland Cavaliers', slug: 'cle', city: 'Cleveland', color: '#860038' },
  DAL: { code: 'DAL', name: 'Dallas Mavericks', slug: 'dal', city: 'Dallas', color: '#00538C' },
  DEN: { code: 'DEN', name: 'Denver Nuggets', slug: 'den', city: 'Denver', color: '#0E2240' },
  DET: { code: 'DET', name: 'Detroit Pistons', slug: 'det', city: 'Detroit', color: '#C8102E' },
  GSW: { code: 'GSW', name: 'Golden State Warriors', slug: 'gs', city: 'Golden State', color: '#1D428A' },
  GS:  { code: 'GSW', name: 'Golden State Warriors', slug: 'gs', city: 'Golden State', color: '#1D428A' },
  HOU: { code: 'HOU', name: 'Houston Rockets', slug: 'hou', city: 'Houston', color: '#CE1141' },
  IND: { code: 'IND', name: 'Indiana Pacers', slug: 'ind', city: 'Indiana', color: '#002D62' },
  LAC: { code: 'LAC', name: 'LA Clippers', slug: 'lac', city: 'LA', color: '#C8102E' },
  LAL: { code: 'LAL', name: 'Los Angeles Lakers', slug: 'lal', city: 'Los Angeles', color: '#552583' },
  MEM: { code: 'MEM', name: 'Memphis Grizzlies', slug: 'mem', city: 'Memphis', color: '#5D76A9' },
  MIA: { code: 'MIA', name: 'Miami Heat', slug: 'mia', city: 'Miami', color: '#98002E' },
  MIL: { code: 'MIL', name: 'Milwaukee Bucks', slug: 'mil', city: 'Milwaukee', color: '#00471B' },
  MIN: { code: 'MIN', name: 'Minnesota Timberwolves', slug: 'min', city: 'Minnesota', color: '#0C2340' },
  NOP: { code: 'NOP', name: 'New Orleans Pelicans', slug: 'no', city: 'New Orleans', color: '#0C2340' },
  NYK: { code: 'NYK', name: 'New York Knicks', slug: 'ny', city: 'New York', color: '#006BB6' },
  NY:  { code: 'NYK', name: 'New York Knicks', slug: 'ny', city: 'New York', color: '#006BB6' },
  OKC: { code: 'OKC', name: 'Oklahoma City Thunder', slug: 'okc', city: 'Oklahoma City', color: '#007AC1' },
  ORL: { code: 'ORL', name: 'Orlando Magic', slug: 'orl', city: 'Orlando', color: '#0077C0' },
  PHI: { code: 'PHI', name: 'Philadelphia 76ers', slug: 'phi', city: 'Philadelphia', color: '#006BB6' },
  PHX: { code: 'PHX', name: 'Phoenix Suns', slug: 'phx', city: 'Phoenix', color: '#1D1160' },
  POR: { code: 'POR', name: 'Portland Trail Blazers', slug: 'por', city: 'Portland', color: '#E03A3E' },
  SAC: { code: 'SAC', name: 'Sacramento Kings', slug: 'sac', city: 'Sacramento', color: '#5A2D81' },
  SAS: { code: 'SAS', name: 'San Antonio Spurs', slug: 'sa', city: 'San Antonio', color: '#C4CED4' },
  TOR: { code: 'TOR', name: 'Toronto Raptors', slug: 'tor', city: 'Toronto', color: '#CE1141' },
  UTA: { code: 'UTA', name: 'Utah Jazz', slug: 'uta', city: 'Utah', color: '#002B5C' },
  WAS: { code: 'WAS', name: 'Washington Wizards', slug: 'was', city: 'Washington', color: '#002B5C' },
};

export function getTeamInfo(teamCode) {
  if (!teamCode) return null;
  const clean = teamCode.trim().toUpperCase();
  const team = NBA_TEAMS[clean];
  if (!team) return null;
  return {
    ...team,
    logoUrl: `https://a.espncdn.com/i/teamlogos/nba/500/${team.slug}.png`
  };
}

export function getTeamLogoUrl(teamCode) {
  const info = getTeamInfo(teamCode);
  return info ? info.logoUrl : null;
}
