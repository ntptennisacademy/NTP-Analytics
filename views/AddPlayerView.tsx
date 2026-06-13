import React from 'react';
import { Player, HittingArm, BackhandType } from '../types';
import { Card, SegmentedControl } from '../components/UI';

interface AddPlayerViewProps {
  playerToEdit?: Player;
  onSave: (player: Omit<Player, 'id'>) => void;
  onCancel: () => void;
}

const AddPlayerView: React.FC<AddPlayerViewProps> = ({ playerToEdit, onSave, onCancel }) => {
  const [name, setName] = React.useState(playerToEdit?.name || '');
  const [team, setTeam] = React.useState(playerToEdit?.team || '');
  const [hittingArm, setHittingArm] = React.useState<HittingArm>(playerToEdit?.hittingArm || 'Right');
  const [backhand, setBackhand] = React.useState<BackhandType>(playerToEdit?.backhand || 'Two-Handed');
  const [utr, setUtr] = React.useState(playerToEdit ? playerToEdit.utrRating.toString() : '0.0');
  const [isSaved, setIsSaved] = React.useState(playerToEdit ? playerToEdit.isSaved : true);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name,
      team,
      hittingArm,
      backhand,
      utrRating: parseFloat(utr) || 0,
      isSaved
    });
  };

  const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className="text-[10px] uppercase font-bold text-iosGray ml-4 mb-2 block tracking-tight">
      {children}
    </label>
  );

  return (
    <div className="min-h-screen bg-iosBg pb-20">
      <header className="sticky top-0 bg-iosBg/80 backdrop-blur-md px-4 pt-10 pb-4 flex justify-between items-center z-50">
        <button onClick={onCancel} className="text-primary font-semibold text-lg">
          Cancel
        </button>
        <h1 className="text-lg font-bold">{playerToEdit ? 'Edit Profile' : 'New Player'}</h1>
        <button 
          onClick={handleSave} 
          disabled={!name.trim()}
          className={`font-semibold text-lg ${name.trim() ? 'text-primary' : 'text-iosGray opacity-40'}`}
        >
          Save
        </button>
      </header>

      <div className="px-4 space-y-6">
        <section>
          <SectionLabel>Basic Info</SectionLabel>
          <Card className="divide-y divide-iosDivider/30 bg-white">
            <label className="flex items-center px-4 py-4 justify-between bg-white cursor-text">
              <span className="text-[16px] font-medium text-black">Name</span>
              <input 
                type="text" 
                placeholder="Full Name" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="flex-1 text-right text-black border-none focus:ring-0 text-[16px] bg-transparent outline-none placeholder:text-iosGray/40 appearance-none" 
              />
            </label>
            <label className="flex items-center px-4 py-4 justify-between bg-white cursor-text">
              <span className="text-[16px] font-medium text-black">Team</span>
              <input 
                type="text" 
                placeholder="Team Name" 
                value={team} 
                onChange={e => setTeam(e.target.value)} 
                className="flex-1 text-right text-black border-none focus:ring-0 text-[16px] bg-transparent outline-none placeholder:text-iosGray/40 appearance-none" 
              />
            </label>
            <label className="flex items-center px-4 py-4 justify-between bg-white cursor-text">
              <span className="text-[16px] font-medium text-black">UTR Rating</span>
              <input 
                type="number" 
                step="0.1"
                placeholder="0.0" 
                value={utr} 
                onChange={e => setUtr(e.target.value)} 
                className="flex-1 text-right text-black border-none focus:ring-0 text-[16px] bg-transparent outline-none w-20 placeholder:text-iosGray/40 appearance-none" 
              />
            </label>
          </Card>
        </section>

        <section>
          <SectionLabel>Style of Play</SectionLabel>
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <span className="text-[10px] text-iosGray font-bold uppercase block ml-1 tracking-widest">Hitting Arm</span>
              <SegmentedControl
                options={[{ label: 'Right', value: 'Right' }, { label: 'Left', value: 'Left' }]}
                value={hittingArm}
                onChange={(v: any) => setHittingArm(v)}
              />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] text-iosGray font-bold uppercase block ml-1 tracking-widest">Backhand</span>
              <SegmentedControl
                options={[{ label: '1-Handed', value: 'One-Handed' }, { label: '2-Handed', value: 'Two-Handed' }]}
                value={backhand}
                onChange={(v: any) => setBackhand(v)}
              />
            </div>
          </Card>
        </section>

        <section>
          <SectionLabel>Directory Settings</SectionLabel>
          <Card className="flex items-center justify-between p-4 bg-white">
            <span className="text-[16px] font-medium text-black">Permanent Save</span>
            <button 
              onClick={() => setIsSaved(!isSaved)}
              className={`w-12 h-7 rounded-full transition-colors relative ${isSaved ? 'bg-green-500' : 'bg-iosDivider'}`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${isSaved ? 'right-1' : 'left-1'}`} />
            </button>
          </Card>
          <p className="text-[11px] text-iosGray mt-2 ml-4 font-medium opacity-80">Only saved players appear in the main directory.</p>
        </section>
      </div>
    </div>
  );
};

export default AddPlayerView;