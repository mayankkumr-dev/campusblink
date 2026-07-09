import React from 'react';

interface AvatarProps {
  url?: string | null;
  name?: string | null;
  size?: number;
  onClick?: () => void;
}

export function Avatar({ 
  url, name, size = 40, onClick 
}: AvatarProps) {
  if (url) {
    return (
      <img
        src={url}
        width={size}
        height={size}
        style={{
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          cursor: onClick ? 'pointer' : 'default'
        }}
        onClick={onClick}
        alt={name || 'Avatar'}
      />
    )
  }

  const initial = name?.charAt(0)?.toUpperCase() || '?';

  const colors = [
    'var(--yellow)', '#FF6B6B', '#4ECDC4',
    '#45B7D1', '#96CEB4', '#FFEAA7'
  ];
  
  const colorIndex = (name?.charCodeAt(0) || 0) % colors.length;
  const bg = colors[colorIndex];

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      cursor: onClick ? 'pointer' : 'default',
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      fontWeight: 700,
      fontSize: size * 0.4,
      color: 'var(--text-primary)'
    }}
    onClick={onClick}>
      {initial}
    </div>
  );
}

export default Avatar;
