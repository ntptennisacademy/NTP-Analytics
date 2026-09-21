import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Match, Player } from '../types';
import { Card, Header, NTPMatchTrackLogo } from '../components/UI';
import { getScoreDetails } from '../logic/tennisLogic';

interface MatchesViewProps {
  matches: Match[];
  players: Player[];
  onNewMatch: () => void;
  onAddPlayer: () => void;
  onViewMatch: (match: Match) => void;
  onDeleteMatch: (id: string) => void;
}

const MatchListItem: React.FC<{
  match: Match;
  players: Player[];
  onView: () => void;
  onDelete: () => void;
}> = ({ match, players, onView, onDelete }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const p1 = players.find(p => p.id === match.config.p1Id);
  const p2 = players.find(p => p.id === match.config.p2Id);
  
  const scoreDetails = getScoreDetails(match.points, match.config);
  const allSets = [...scoreDetails.setHistory];
  if (!scoreDetails.isMatchOver) {
    allSets.push({ p1: scoreDetails.p1Games, p2: scoreDetails.p2Games });
  }

  return (
    <div className="relative overflow-hidden group rounded-xl">
      {/* Delete Action Background */}
      <div className="absolute inset-0 bg-[#FF3B30] flex justify-end items-center px-8 z-0">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-white flex flex-col items-center gap-1"
        >
          <i className="fa-solid fa-trash-can text-xl"></i>
          <span className="text-[10px] font-bold uppercase tracking-widest">Delete</span>
        </button>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        animate={{ x: isOpen ? -100 : 0 }}
        onDragEnd={(_event: unknown, info: { offset: { x: number } }) => {
          if (info.offset.x < -40) {
            setIsOpen(true);
          } else {
            setIsOpen(false);
          }
        }}
        className="relative z-10 bg-iosBg cursor-pointer active:scale-[0.99] transition-transform duration-150"
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
          } else {
            onView();
          }
        }}
      >
        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-primary text-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest flex justify-between items-center h-10">
            <div className="flex items-center gap-2">
              <span>{new Date(match.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              {!match.isCompleted && (
                <span className="bg-yellow-400 text-black px-1.5 py-0.5 rounded-[4px] text-[8px] font-black animate-pulse">In Progress</span>
              )}
            </div>
            <i className="fa-solid fa-chevron-left text-[8px] opacity-30 group-hover:translate-x-[-2px] transition-transform"></i>
          </div>
          <div className="p-5 pb-3 space-y-4 bg-white">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-[12px] font-black uppercase ring-2 ring-primary/10">
                  {p1?.name?.[0] || (match.config.p1Name ? match.config.p1Name[0] : '1')}
                </div>
                <span className="font-bold text-[15px] text-black/90">{p1?.name || match.config.p1Name || 'Player 1'}</span>
              </div>
              <div className="flex gap-4">
                {allSets.map((s, idx) => (
                  <span key={idx} className="font-black text-2xl scoreboard-font tabular-nums">{s.p1}</span>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-[12px] font-black uppercase ring-2 ring-primary/10">
                  {p2?.name?.[0] || (match.config.p2Name ? match.config.p2Name[0] : '2')}
                </div>
                <span className="font-bold text-[15px] text-black/90">{p2?.name || match.config.p2Name || 'Player 2'}</span>
              </div>
              <div className="flex gap-4">
                {allSets.map((s, idx) => (
                  <span key={idx} className="font-black text-2xl scoreboard-font tabular-nums">{s.p2}</span>
                ))}
              </div>
            </div>
            <div className="pt-1 text-[10px] text-iosGray font-bold uppercase tracking-widest text-center opacity-40 h-4">
              {match.finalScore.includes('(') ? match.finalScore.split('(')[1].replace(')', '') : ''}
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

const MatchesView: React.FC<MatchesViewProps> = ({ matches, players, onNewMatch, onAddPlayer, onViewMatch, onDeleteMatch }) => {
  const [showMenu, setShowMenu] = React.useState(false);

  return (
    <div className="min-h-screen">
      <Header 
        title="Matches" 
        leftAction={<NTPMatchTrackLogo size={14} />}
        rightAction={
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} aria-label="Add menu" className="w-8 h-8 flex items-center justify-center bg-primary/5 rounded-full text-primary transition-colors hover:bg-primary/10">
              <i className="fa-solid fa-plus"></i>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-10 w-48 bg-white border border-iosDivider rounded-xl shadow-2xl py-1 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                <button onClick={() => { onNewMatch(); setShowMenu(false); }} className="w-full text-left px-4 py-3.5 text-sm border-b border-iosDivider hover:bg-iosBg font-bold transition-colors">New Match</button>
                <button onClick={() => { onAddPlayer(); setShowMenu(false); }} className="w-full text-left px-4 py-3.5 text-sm hover:bg-iosBg font-bold transition-colors">Add New Player</button>
              </div>
            )}
          </div>
        }
      />
      
      <div className="p-4 space-y-4">
        {matches.length === 0 ? (
          <div className="text-center py-20 text-iosGray flex flex-col items-center">
            <NTPMatchTrackLogo size={32} variant="long" className="mb-6 opacity-20" />
            <p className="font-medium">No matches yet.</p>
            <button onClick={onNewMatch} className="mt-4 text-primary font-bold text-lg">Start your first match</button>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {matches.map(match => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
                layout
              >
                <MatchListItem 
                  match={match} 
                  players={players} 
                  onView={() => onViewMatch(match)}
                  onDelete={() => onDeleteMatch(match.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
      <div className="h-24" /> {/* Spacer for bottom navigation */}
    </div>
  );
};

export default MatchesView;
