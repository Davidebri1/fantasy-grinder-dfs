import React, { useState } from 'react';
import { getTeamInfo } from '../services/teamDatabase';

export default function TeamLogo({ team, size = 20, className = "" }) {
  const [hasError, setHasError] = useState(false);
  const info = getTeamInfo(team);

  if (!team) return null;

  if (!info || hasError) {
    return (
      <span 
        className={`inline-flex items-center justify-center font-mono font-bold text-[10px] rounded px-1 text-gray-300 bg-slate-800/80 border border-slate-700/60 ${className}`}
        style={{ height: size, minWidth: size }}
        title={team}
      >
        {team}
      </span>
    );
  }

  return (
    <span 
      className={`inline-flex items-center justify-center flex-shrink-0 relative ${className}`}
      style={{ width: size, height: size }}
      title={info.name}
    >
      <img
        src={info.logoUrl}
        alt={info.name}
        onError={() => setHasError(true)}
        referrerPolicy="no-referrer"
        className="w-full h-full object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
        style={{ width: size, height: size }}
        loading="lazy"
      />
    </span>
  );
}
