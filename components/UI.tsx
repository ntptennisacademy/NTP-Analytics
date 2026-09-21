import React from 'react';
import analyticsLogo from '../assets/Logo.png';

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
  <div
    className={`overflow-hidden ${className}`}
    style={{
      width: size * (variant === 'long' ? 7.5 : 6.75),
      height: size * (variant === 'long' ? 4.2 : 3),
    }}
  >
    <img
      src={analyticsLogo}
      alt="NTP Analytics"
      className="h-full w-full object-cover object-center mix-blend-multiply"
    />
  </div>
);
