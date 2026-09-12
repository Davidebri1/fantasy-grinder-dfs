import React, { useState, useEffect } from 'react';

export default function AthleteAvatar({ 
  src, 
  name, 
  team, 
  sport = 'mma', 
  size = 'md',
  className = '',
  backdrop
}) {
  const [hasError, setHasError] = useState(!src);
  const [bgMode, setBgMode] = useState(() => {
    return localStorage.getItem('avatar_bg_mode') || 'transparent';
  });

  useEffect(() => {
    const handleBgChange = () => {
      setBgMode(localStorage.getItem('avatar_bg_mode') || 'transparent');
    };
    window.addEventListener('avatar_bg_change', handleBgChange);
    return () => window.removeEventListener('avatar_bg_change', handleBgChange);
  }, []);

  const activeMode = backdrop || bgMode; // 'transparent' (no background at all, just portrait) or 'white'
  const isWhite = activeMode === 'white';

  const getInitials = (fullName) => {
    if (!fullName) return '?';
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
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
        backgroundColor: isWhite ? '#FFFFFF' : 'transparent',
        border: isWhite ? '1.5px solid rgba(255, 255, 255, 0.5)' : 'none',
        boxShadow: isWhite ? '0 2px 6px rgba(0, 0, 0, 0.35)' : 'none',
        userSelect: 'none'
      }}
      title={name}
    >
      {/* Fallback ONLY displayed if image fails to load or has no src */}
      {(hasError || !src) && (
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
            color: isWhite ? '#475569' : '#94A3B8',
            background: isWhite ? '#E2E8F0' : '#1E293B',
            borderRadius: '50%',
            zIndex: 0
          }}
        >
          {getInitials(name)}
        </div>
      )}

      {/* Headshot cutout image placed with zero background or clean white */}
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
            filter: isWhite ? 'none' : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))',
            transition: 'opacity 0.2s ease-in-out'
          }}
          onError={() => setHasError(true)}
        />
      ) : null}
    </div>
  );
}
