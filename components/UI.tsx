import React from 'react';

interface SegmentedControlProps<T> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string | number>({ options, value, onChange, className = "" }: SegmentedControlProps<T>) {
  return (
    <div className={`flex bg-iosBg p-1 rounded-lg w-full ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
            value === opt.value
              ? 'bg-white text-black shadow-sm'
              : 'text-iosGray'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`bg-iosCard rounded-xl shadow-sm border border-iosDivider/30 overflow-hidden ${className}`}>
    {children}
  </div>
);

export const Header: React.FC<{ title: string; leftAction?: React.ReactNode; rightAction?: React.ReactNode }> = ({ title, leftAction, rightAction }) => (
  <header className="sticky top-0 bg-iosBg/80 backdrop-blur-md px-4 pt-10 pb-4 flex justify-between items-center z-40 border-b border-iosDivider/20">
    <div className="flex items-center justify-start text-primary min-w-[100px]">
        {leftAction}
    </div>
    <h1 className="text-lg font-bold text-center flex-1">{title}</h1>
    <div className="w-14 flex items-center justify-end text-primary text-2xl">
        {rightAction}
    </div>
  </header>
);

export const NTPMatchTrackLogo: React.FC<{ className?: string; size?: number; variant?: 'long' | 'short' }> = ({ className = "", size = 16, variant = 'short' }) => (
  <div className={`flex items-center gap-1.5 ${className}`}>
    {variant === 'short' && (
      <div className="relative" style={{ width: size * 1.5, height: size * 1.5 }}>
        <i className="fa-solid fa-tennis-ball text-primary absolute inset-0 flex items-center justify-center" style={{ fontSize: size }}></i>
        <i className="fa-solid fa-chart-simple text-primary/30 absolute bottom-0 right-0" style={{ fontSize: size * 0.6 }}></i>
      </div>
    )}
    <div 
      className="text-black font-black uppercase tracking-tighter leading-none whitespace-nowrap"
      style={{ fontSize: size, fontFamily: 'Arial Black, sans-serif' }}
    >
      {variant === 'short' ? (
        <><span className="text-primary italic">NTP</span> ANALYTICS</>
      ) : (
        <span className="text-primary italic">NEXT TENNIS PRO</span>
      )}
    </div>
  </div>
);
