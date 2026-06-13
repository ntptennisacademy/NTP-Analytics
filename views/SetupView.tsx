import React from 'react';
import { Player, MatchConfig, CourtSurface, CourtSpeed, CourtType, ScoringType, DecidingSetFormat } from '../types';
import { Header, SegmentedControl, Card } from '../components/UI';

interface SetupViewProps {
  players: Player[];
  onStartMatch: (config: MatchConfig) => void;
  onCancel: () => void;
  onAddNewPlayer: () => void;
  initialConfig?: MatchConfig;
}

const SetupView: React.FC<SetupViewProps> = ({ players, onStartMatch, onCancel, onAddNewPlayer, initialConfig }) => {
  const [matchType, setMatchType] = React.useState<'Singles' | 'Doubles'>('Singles');
  const [p1Id, setP1Id] = React.useState(initialConfig?.p1Id || '');
  const [p2Id, setP2Id] = React.useState(initialConfig?.p2Id || '');
  const [serverId, setServerId] = React.useState(initialConfig?.initialServerId || '');
  const [scoringType, setScoringType] = React.useState<ScoringType>(initialConfig?.scoringType || 'Shot Stats');
  const [adScoring, setAdScoring] = React.useState(initialConfig ? initialConfig.adScoring : true);
  const [tieBreak, setTieBreak] = React.useState(initialConfig ? initialConfig.tieBreak : true);
  const [numSets, setNumSets] = React.useState<any>(initialConfig?.setsToWin || 1);
  const [gamesPerSet, setGamesPerSet] = React.useState(initialConfig?.gamesPerSet || 6);
  const [decidingSetFormat, setDecidingSetFormat] = React.useState<DecidingSetFormat>(initialConfig?.decidingSetFormat || 'Full Set');
  const [surface, setSurface] = React.useState<CourtSurface>(initialConfig?.courtSurface || 'Hard');
  const [speed, setSpeed] = React.useState<CourtSpeed>(initialConfig?.courtSpeed || 'Neutral');
  const [type, setType] = React.useState<CourtType>(initialConfig?.courtType || 'Outdoor');
  
  const [description, setDescription] = React.useState(initialConfig?.description || '');
  const [city, setCity] = React.useState(initialConfig?.city || '');
  const [state, setState] = React.useState(initialConfig?.state || '');
  const [temp, setTemp] = React.useState(initialConfig?.temperature || '');
  const [humidity, setHumidity] = React.useState(initialConfig?.humidity || '');
  const [round, setRound] = React.useState(initialConfig?.round || '');

  const [trackServe, setTrackServe] = React.useState(initialConfig?.trackServe ?? true);
  const [trackShotPlacement, setTrackShotPlacement] = React.useState(initialConfig?.trackShotPlacement ?? true);
  const [trackErrorType, setTrackErrorType] = React.useState(initialConfig?.trackErrorType ?? true);

  const canStart = p1Id && p2Id && serverId;

  const handleStart = () => {
    if (!canStart) return;
    const p1 = players.find(p => p.id === p1Id);
    const p2 = players.find(p => p.id === p2Id);
    
    onStartMatch({
      p1Id,
      p2Id,
      p1Name: p1?.name || initialConfig?.p1Name,
      p2Name: p2?.name || initialConfig?.p2Name,
      initialServerId: serverId,
      scoringType,
      adScoring,
      tieBreak,
      setsToWin: numSets,
      gamesPerSet,
      decidingSetFormat,
      courtSurface: surface,
      courtSpeed: speed,
      courtType: type,
      description,
      city,
      state,
      temperature: temp,
      humidity,
      round,
      existingMatchId: initialConfig?.existingMatchId,
      trackServe,
      trackShotPlacement,
      trackErrorType
    });
  };

  const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className="text-[10px] uppercase font-bold text-iosGray ml-4 mb-2 block tracking-tight">
      {children}
    </label>
  );

  const showDecidingSetOption = numSets === 3 || numSets === 5;

  return (
    <div className="min-h-screen bg-iosBg pb-20">
      <header className="sticky top-0 bg-iosBg/80 backdrop-blur-md px-4 pt-10 pb-4 flex justify-between items-center z-50">
        <button onClick={onCancel} className="text-primary flex items-center gap-1 font-semibold text-lg">
          <i className="fa-solid fa-chevron-left text-sm"></i> {initialConfig ? 'Edit Match' : 'Matches'}
        </button>
        <button 
          onClick={handleStart} 
          disabled={!canStart}
          className={`font-semibold text-lg ${canStart ? 'text-primary' : 'text-iosGray opacity-40'}`}
        >
          {initialConfig ? 'Save Changes' : 'Start Match'}
        </button>
      </header>

      <div className="px-4 space-y-6">
        <section>
          <SectionLabel>Match Type</SectionLabel>
          <Card className="p-4">
            <SegmentedControl
              options={[{ label: 'Singles', value: 'Singles' }, { label: 'Doubles', value: 'Doubles' }]}
              value={matchType}
              onChange={(v: any) => setMatchType(v)}
            />
          </Card>
        </section>

        <section className="mt-6">
          <SectionLabel>Players</SectionLabel>
          <Card>
            <button 
              onClick={onAddNewPlayer}
              className="w-full text-left px-4 py-4 text-primary font-bold text-[16px] border-b border-iosDivider/50"
            >
              Add New Player
            </button>
            <div className="p-4 space-y-3">
              <div className="relative">
                <select 
                  value={p1Id} 
                  onChange={(e) => setP1Id(e.target.value)}
                  className="w-full bg-[#E9E9EB] p-3.5 rounded-lg text-[16px] border-none focus:ring-1 focus:ring-primary appearance-none outline-none"
                >
                  <option value="">Player One</option>
                  {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  {p1Id && !players.find(p => p.id === p1Id) && initialConfig?.p1Name && (
                    <option value={p1Id}>{initialConfig.p1Name} (Unsaved)</option>
                  )}
                </select>
              </div>
              <div className="relative">
                <select 
                  value={p2Id} 
                  onChange={(e) => setP2Id(e.target.value)}
                  className="w-full bg-[#E9E9EB] p-3.5 rounded-lg text-[16px] border-none focus:ring-1 focus:ring-primary appearance-none outline-none"
                >
                  <option value="">Player Two</option>
                  {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  {p2Id && !players.find(p => p.id === p2Id) && initialConfig?.p2Name && (
                    <option value={p2Id}>{initialConfig.p2Name} (Unsaved)</option>
                  )}
                </select>
              </div>
              
              <div className="flex bg-[#E9E9EB] p-1 rounded-lg">
                 <button 
                   onClick={() => p1Id && setServerId(p1Id)}
                   className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${serverId === p1Id ? 'bg-white shadow-sm' : 'text-black/60'}`}
                 >
                   {p1Id ? `${players.find(p=>p.id===p1Id)?.name} Serving` : 'Player 1 Serving'}
                 </button>
                 <button 
                   onClick={() => p2Id && setServerId(p2Id)}
                   className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${serverId === p2Id ? 'bg-white shadow-sm' : 'text-black/60'}`}
                 >
                   {p2Id ? `${players.find(p=>p.id===p2Id)?.name} Serving` : 'Player 2 Serving'}
                 </button>
              </div>
            </div>
          </Card>
        </section>

        <section className="mt-6">
          <SectionLabel>Number of Sets</SectionLabel>
          <Card className="p-4">
            <SegmentedControl
              options={[
                { label: '1', value: 1 },
                { label: '3', value: 3 },
                { label: '5', value: 5 },
                { label: 'Pro Set', value: 'Pro Set' },
                { label: 'Fast4', value: 'Fast4' }
              ]}
              value={numSets}
              onChange={(v: any) => setNumSets(v)}
            />
          </Card>
        </section>

        {showDecidingSetOption && (
          <section className="mt-6">
            <SectionLabel>Deciding Set Format</SectionLabel>
            <Card className="p-4">
              <SegmentedControl
                options={[
                  { label: 'Full Set', value: 'Full Set' },
                  { label: 'Super Tiebreak (10pt)', value: 'Super Tiebreak' }
                ]}
                value={decidingSetFormat}
                onChange={(v: any) => setDecidingSetFormat(v)}
              />
            </Card>
          </section>
        )}

        <section className="mt-6">
          <SectionLabel>Number of Games per Set</SectionLabel>
          <Card className="p-4 pt-6">
            <input 
              type="range" 
              min="2" 
              max="10" 
              value={gamesPerSet} 
              onChange={(e) => setGamesPerSet(parseInt(e.target.value))}
              className="w-full accent-primary h-1 bg-iosBg rounded-lg appearance-none cursor-pointer mb-6"
            />
            <div className="flex justify-between px-1 text-xs font-bold text-iosGray">
              {[2,3,4,5,6,7,8,9,10].map(n => (
                <span key={n} className={gamesPerSet === n ? 'text-primary' : ''}>{n}</span>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-6">
          <SectionLabel>Scoring Type</SectionLabel>
          <Card className="p-4">
            <SegmentedControl
              options={[{ label: 'Simple', value: 'Simple' }, { label: 'Shot Stats', value: 'Shot Stats' }]}
              value={scoringType}
              onChange={(v: any) => setScoringType(v)}
            />
          </Card>
        </section>

        {scoringType === 'Shot Stats' && (
          <section className="mt-6">
            <SectionLabel>Advanced Tracking</SectionLabel>
            <Card className="divide-y divide-iosDivider/30">
              <div className="flex items-center px-4 py-3 justify-between">
                <div className="flex flex-col">
                  <span className="text-[16px] font-medium">Serve Placement & Type</span>
                  <span className="text-[10px] text-iosGray font-bold uppercase tracking-tighter">Deuce/Ad, T/Body/Wide</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={trackServe} 
                  onChange={e => setTrackServe(e.target.checked)}
                  className="w-6 h-6 accent-primary"
                />
              </div>
              <div className="flex items-center px-4 py-3 justify-between">
                <div className="flex flex-col">
                  <span className="text-[16px] font-medium">Shot Placement</span>
                  <span className="text-[10px] text-iosGray font-bold uppercase tracking-tighter">Cross, Middle, Line</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={trackShotPlacement} 
                  onChange={e => setTrackShotPlacement(e.target.checked)}
                  className="w-6 h-6 accent-primary"
                />
              </div>
              <div className="flex items-center px-4 py-3 justify-between">
                <div className="flex flex-col">
                  <span className="text-[16px] font-medium">Error Anatomy</span>
                  <span className="text-[10px] text-iosGray font-bold uppercase tracking-tighter">Net, Long, Wide</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={trackErrorType} 
                  onChange={e => setTrackErrorType(e.target.checked)}
                  className="w-6 h-6 accent-primary"
                />
              </div>
            </Card>
          </section>
        )}

        <section className="mt-6">
          <SectionLabel>Match Options</SectionLabel>
          <Card className="p-4 space-y-4">
            <SegmentedControl
              options={[{ label: 'Ad Scoring', value: 'ad' }, { label: 'No-Ad Scoring', value: 'no-ad' }]}
              value={adScoring ? 'ad' : 'no-ad'}
              onChange={(v) => setAdScoring(v === 'ad')}
            />
            <SegmentedControl
              options={[{ label: 'Tie Break', value: 'tb' }, { label: 'No Tie Break', value: 'no-tb' }]}
              value={tieBreak ? 'tb' : 'no-tb'}
              onChange={(v) => setTieBreak(v === 'tb')}
            />
          </Card>
        </section>

        <section className="mt-6">
           <SectionLabel>Match Details</SectionLabel>
           <Card className="divide-y divide-iosDivider/30">
              <label className="flex items-center px-4 py-3 justify-between">
                <span className="text-[16px] font-medium">Description</span>
                <input 
                  type="text" 
                  placeholder="Match Description"
                  className="text-right text-iosGray border-none focus:ring-0 text-[16px] bg-transparent outline-none appearance-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <label className="flex items-center px-4 py-3 justify-between">
                <span className="text-[16px] font-medium">Round #</span>
                <input 
                  type="text" 
                  placeholder="e.g. Final, R16"
                  className="text-right text-iosGray border-none focus:ring-0 text-[16px] bg-transparent outline-none appearance-none"
                  value={round}
                  onChange={(e) => setRound(e.target.value)}
                />
              </label>
           </Card>
        </section>

        <section className="mt-6 pb-12">
          <SectionLabel>Location and Weather</SectionLabel>
          <Card className="divide-y divide-iosDivider/30">
            <button className="w-full p-4 text-center text-primary text-[16px] font-bold">Get Current Location and Weather</button>
            <div className="flex items-center px-4 py-3 justify-between">
              <span className="text-[16px] font-medium">City</span>
              <input type="text" placeholder="City" value={city} onChange={e=>setCity(e.target.value)} className="text-right text-iosGray border-none focus:ring-0 text-[16px] bg-transparent appearance-none" />
            </div>
            <div className="flex items-center px-4 py-3 justify-between">
              <span className="text-[16px] font-medium">State</span>
              <input type="text" placeholder="State" value={state} onChange={e=>setState(e.target.value)} className="text-right text-iosGray border-none focus:ring-0 text-[16px] bg-transparent appearance-none" />
            </div>
            <div className="flex items-center px-4 py-3 justify-between">
              <span className="text-[16px] font-medium">Court Surface</span>
              <SegmentedControl className="max-w-[180px]" options={[{label:'Hard', value:'Hard'}, {label:'Clay', value:'Clay'}, {label:'Grass', value:'Grass'}]} value={surface} onChange={(v: any) => setSurface(v)} />
            </div>
            <div className="flex items-center px-4 py-3 justify-between">
              <span className="text-[16px] font-medium">Court Speed</span>
              <SegmentedControl className="max-w-[180px]" options={[{label:'Slow', value:'Slow'}, {label:'Neutral', value:'Neutral'}, {label:'Fast', value:'Fast'}]} value={speed} onChange={(v: any) => setSpeed(v)} />
            </div>
            <div className="flex items-center px-4 py-3 justify-between">
              <span className="text-[16px] font-medium">Court Type</span>
              <SegmentedControl className="max-w-[180px]" options={[{label:'Outdoor', value:'Outdoor'}, {label:'Indoor', value:'Indoor'}]} value={type} onChange={(v: any) => setType(v)} />
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default SetupView;