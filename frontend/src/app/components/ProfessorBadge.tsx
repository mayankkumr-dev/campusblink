import React from 'react';

interface ProfessorBadgeProps {
  size?: 'sm' | 'md';
  className?: string;
}

export const ProfessorBadge: React.FC<ProfessorBadgeProps> = ({ size = 'sm', className = '' }) => {
  const sizeClasses = size === 'md'
    ? 'px-3 py-1 text-xs'
    : 'px-2 py-0.5 text-[10px]';

  return (
    <span className={`inline-flex items-center gap-1 font-bold rounded-md bg-[#FEF9C3] text-[var(--yellow-dark)] border border-[#F59E0B]/30 tracking-wide ${sizeClasses} ${className}`}>
      Faculty 🎓
    </span>
  );
};
