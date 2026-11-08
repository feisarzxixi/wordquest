import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverEffect = false,
  ...props
}) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] p-6 sm:p-8 ${
        hoverEffect ? 'transition-all duration-200 hover:shadow-lg hover:border-slate-200' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
