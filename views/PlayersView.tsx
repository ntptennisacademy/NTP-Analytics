
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Player } from '../types';
import { Card, Header } from '../components/UI';

interface PlayersViewProps {
  players: Player[];
  onAddPlayer: () => void;
  onEditPlayer: (player: Player) => void;
  onDeletePlayer: (id: string) => void;
}

const PlayerListItem: React.FC<{
  player: Player;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ player, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative overflow-hidden group rounded-xl select-none">
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
        onDragEnd={(_, info) => {
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
            onEdit();
          }
        }}
      >
        <Card className="p-4 flex items-center gap-4 bg-white border-none shadow-md">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold uppercase ring-2 ring-primary/10 select-none">
            {player.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-black truncate">{player.name}</h3>
            {player.team && <p className="text-[12px] text-iosGray font-semibold tracking-wide uppercase opacity-75 truncate">{player.team}</p>}
            <div className="flex gap-4 text-sm text-iosGray mt-2">
              <div>
                <div className="text-[10px] uppercase font-black tracking-tight opacity-50">UTR</div>
                <div className="text-black font-bold">{player.utrRating.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-black tracking-tight opacity-50">Hand / Backhand</div>
                <div className="text-black font-semibold">{player.hittingArm} / {player.backhand === 'One-Handed' ? '1H' : '2H'}</div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

const PlayersView: React.FC<PlayersViewProps> = ({ players, onAddPlayer, onEditPlayer, onDeletePlayer }) => {
  const savedPlayers = players.filter(p => p.isSaved);

  return (
    <div className="min-h-screen">
      <Header 
        title="Players" 
        rightAction={<button onClick={onAddPlayer} aria-label="Add player"><i className="fa-solid fa-plus"></i></button>} 
      />
      
      <div className="p-4 space-y-4">
        {savedPlayers.length === 0 ? (
          <div className="text-center py-20 text-iosGray">
            <p>No players saved.</p>
            <button onClick={onAddPlayer} className="mt-4 text-primary font-semibold">Create your first player profile</button>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {savedPlayers.map(player => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
                layout
              >
                <PlayerListItem 
                  player={player} 
                  onEdit={() => onEditPlayer(player)}
                  onDelete={() => onDeletePlayer(player.id)}
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

export default PlayersView;
