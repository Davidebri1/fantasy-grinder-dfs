import React, { useState } from 'react';

export default function AthleteAvatar({ 
  src, 
  name, 
  team, 
  sport = 'mma', 
  size = 'md',
  className = '' 
}) {
  const [hasError, setHasError] = useState(!src);

  const getInitials = (fullName) => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  const getSportGradient = (sp) => {
    switch ((sp || '').toLowerCase()) {
      case 'nba':
        return 'linear-gradient(135deg, #1D4ED8 0%, #0F172A 100%)';
      case 'golf':
        return 'linear-gradient(135deg, #059669 0%, #022C22 100%)';
      case 'mma':
      default:
        return 'linear-gradient(135deg, #4F46E5 0%, #1E1B4B 100%)';
    }
  };

  const pixelSizes = {
    xs: 26,
    sm: 32,
    md: 40,
    lg: 52,
    xl: 64
  };

  const px = pixelSizes[size] || 40;

  return (
    <div 
      className={`athlete-avatar-container ${className}`}
      style={{
        width: `${px}px`,
        height: `${px}px`,
        minWidth: `${px}px`,
        minHeight: `${px}px`,
        maxWidth: `${px}px`,
        maxHeight: `${px}px`,
        borderRadius: '50%',
        overflow: 'hidden',
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        backgroundColor: '#121620',
        border: '1.5px solid rgba(255, 255, 255, 0.16)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
        userSelect: 'none'
      }}
      title={name}
    >
      {/* Underlying fallback initials */}
      <div 
        className="athlete-avatar-fallback"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          fontWeight: 800,
          fontSize: `${Math.round(px * 0.38)}px`,
          color: '#FFFFFF',
          background: getSportGradient(sport),
          zIndex: 0
        }}
      >
        {getInitials(name)}
      </div>

      {/* Headshot image placed over fallback */}
      {!hasError && src ? (
        <img
          src={src}
          alt={name}
          loading="eager"
          referrerPolicy="no-referrer"
          className="athlete-avatar-img"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            minWidth: '100%',
            minHeight: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'cover',
            objectPosition: 'center 15%',
            borderRadius: '50%',
            zIndex: 1,
            display: 'block',
            transition: 'opacity 0.2s ease-in-out'
          }}
          onError={() => setHasError(true)}
        />
      ) : null}
    </div>
  );
}
