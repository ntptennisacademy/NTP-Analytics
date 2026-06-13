
import React from 'react';
import { Tab } from '../types';
import { supabase } from '../supabaseClient';

interface LayoutProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  children: React.ReactNode;
}

const RacketIcon = ({ active }: { active: boolean }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15.5 2C13.57 2 12 3.57 12 5.5C12 6.3 12.27 7.04 12.73 7.63L4.11 16.25C3.72 16.64 3.72 17.27 4.11 17.66L6.34 19.89C6.73 20.28 7.36 20.28 7.75 19.89L16.37 11.27C16.96 11.73 17.7 12 18.5 12C20.43 12 22 10.43 22 8.5C22 6.57 20.43 5 18.5 5C17.7 5 16.96 5.27 16.37 5.73L15.77 5.13C15.92 4.94 16 4.71 16 4.47V4.5C16 3.12 14.88 2 13.5 2H15.5ZM18.5 7C17.67 7 17 6.33 17 5.5C17 4.67 17.67 4 18.5 4C19.33 4 20 4.67 20 5.5C20 6.33 19.33 7 18.5 7Z" fill={active ? "#0F5CCE" : "#8E8E93"}/>
    <path d="M7.05 18.48L5.52 16.95L13.11 9.36L14.64 10.89L7.05 18.48Z" fill={active ? "#0F5CCE" : "#8E8E93"}/>
  </svg>
);

const Layout: React.FC<LayoutProps> = ({ activeTab, setActiveTab, children }) => {
  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to sign out?");
    if (confirmLogout) {
      await supabase.auth.signOut();
    }
  };

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
          onClick={handleLogout}
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
