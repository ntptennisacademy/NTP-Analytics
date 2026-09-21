
import React from 'react';
import { Tab } from '../types';

interface LayoutProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  children: React.ReactNode;
  onSignOut: () => void;
}

const RacketIcon = ({ active }: { active: boolean }) => (
  <svg width="27" height="27" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <clipPath id="matches-racket-head">
        <ellipse cx="16" cy="10" rx="7" ry="8.5" />
      </clipPath>
    </defs>
    <g transform="rotate(38 16 16)" stroke={active ? '#0F5CCE' : '#8E8E93'} strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="16" cy="10" rx="7" ry="8.5" strokeWidth="2.4" />
      <g clipPath="url(#matches-racket-head)" strokeWidth="1" opacity="0.72">
        <path d="M11 2v16M14.3 1v18M17.7 1v18M21 2v16" />
        <path d="M9 6h14M9 10h14M9 14h14" />
      </g>
      <path d="M16 18.5V27" strokeWidth="2.8" />
      <path d="M13.8 27h4.4v3h-4.4z" strokeWidth="2.2" />
    </g>
  </svg>
);

const Layout: React.FC<LayoutProps> = ({ activeTab, setActiveTab, onSignOut, children }) => {
  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-iosBg overflow-hidden">
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-iosDivider/30 flex justify-around items-center h-20 pb-6 z-50">
        <button
          onClick={() => setActiveTab(Tab.Matches)}
          className={`flex flex-col items-center gap-1.5 w-full transition-all duration-200 ${activeTab === Tab.Matches ? 'text-primary' : 'text-iosGray'}`}
        >
          <div className="mb-0.5">
            <RacketIcon active={activeTab === Tab.Matches} />
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest ${activeTab === Tab.Matches ? 'opacity-100' : 'opacity-60'}`}>Matches</span>
        </button>
        <button
          onClick={() => setActiveTab(Tab.Players)}
          className={`flex flex-col items-center gap-1.5 w-full transition-all duration-200 ${activeTab === Tab.Players ? 'text-primary' : 'text-iosGray'}`}
        >
          <i className={`fa-solid fa-users text-xl ${activeTab === Tab.Players ? 'opacity-100' : 'opacity-40'}`}></i>
          <span className={`text-[10px] font-black uppercase tracking-widest ${activeTab === Tab.Players ? 'opacity-100' : 'opacity-60'}`}>Players</span>
        </button>
        <button
          onClick={onSignOut}
          className="flex flex-col items-center gap-1.5 w-full text-iosGray hover:text-[#FF3B30] active:scale-95 transition-all duration-200"
        >
          <i className="fa-solid fa-right-from-bracket text-xl opacity-60"></i>
          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Logout</span>
        </button>
      </nav>
    </div>
  );
};

export default Layout;
