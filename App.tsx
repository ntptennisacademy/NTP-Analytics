import React from 'react';
import Layout from './components/Layout';
import { Tab, Player, Match, MatchConfig, Point } from './types';
import MatchesView from './views/MatchesView';
import PlayersView from './views/PlayersView';
import SetupView from './views/SetupView';
import ActiveMatchView from './views/ActiveMatchView';
import AddPlayerView from './views/AddPlayerView';
import { getFinalScoreString, getScoreDetails } from './logic/tennisLogic';
import { supabase } from './supabaseClient';
import { AuthView } from './views/AuthView';
import { loadWorkspace, upsertPlayer, removePlayer, upsertMatch, removeMatch } from './repository';
import type { User } from '@supabase/supabase-js';
import { consumeSsoHandoff, hasSsoHandoff } from './ssoHandoff';
import { arrivedForPasswordReset } from './passwordReset';
import { ResetPasswordView } from './views/ResetPasswordView';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<Tab>(Tab.Matches);
  const [players, setPlayers] = React.useState<Player[]>([]);
  const [matches, setMatches] = React.useState<Match[]>([]);
  const matchesRef = React.useRef<Match[]>([]);
  const [isSettingUp, setIsSettingUp] = React.useState(false);
  const [isAddingPlayer, setIsAddingPlayer] = React.useState(false);
  const [editingPlayer, setEditingPlayer] = React.useState<Player | null>(null);
  const [activeMatchConfig, setActiveMatchConfig] = React.useState<MatchConfig | null>(null);
  const [activeMatchId, setActiveMatchId] = React.useState<string | null>(null);
  const [viewingMatch, setViewingMatch] = React.useState<Match | null>(null);
  const [editingSettingsMatch, setEditingSettingsMatch] = React.useState<Match | null>(null);

  const [sessionUser, setSessionUser] = React.useState<User | null>(null);
  const [access, setAccess] = React.useState<'checking' | 'signedOut' | 'ready' | 'error'>('checking');
  const [accessError, setAccessError] = React.useState('');
  const [refreshKey, setRefreshKey] = React.useState(0);
  // Coaches arriving from the NTP Superapp's Analytics tile carry a hand-off
  // code we redeem before deciding whether anyone is signed in.
  const [ssoBusy, setSsoBusy] = React.useState(hasSsoHandoff);
  const [handoffError, setHandoffError] = React.useState('');
  // A recovery link signs the user in as it lands, so without this they would
  // sail past the reset form straight into the app and never set a password.
  const [recovering, setRecovering] = React.useState(arrivedForPasswordReset);
  const [syncError, setSyncError] = React.useState('');
  const [pendingWrites, setPendingWrites] = React.useState(0);
  const operations = React.useRef<Array<{ key: string; run: () => Promise<void> }>>([]);
  const flushing = React.useRef(false);

  React.useEffect(() => {
    if (!supabase) return;
    let active = true;
    const db = supabase;
    const check = async () => {
      setAccess('checking');
      try {
        try {
          await consumeSsoHandoff(db);
        } catch (error) {
          // Fall through to the normal sign-in form rather than dead-ending.
          if (active) setHandoffError(error instanceof Error ? error.message
            : 'Could not sign you in from the NTP Superapp.');
        } finally {
          if (active) setSsoBusy(false);
        }
        const { data: sessionData, error: sessionError } = await db.auth.getSession();
        if (sessionError) throw sessionError;
        if (!sessionData.session) {
          if (active) {
            setSessionUser(null);
            setPlayers([]);
            matchesRef.current = [];
            setMatches([]);
            setAccess('signedOut');
          }
          return;
        }
        const { data: userData, error: userError } = await db.auth.getUser();
        if (userError) throw userError;
        const user = userData.user;
        if (!user) throw new Error('Could not verify your account.');
        const workspace = await loadWorkspace(user.id);
        if (!active) return;
        setSessionUser(user);
        setPlayers(workspace.players);
        matchesRef.current = workspace.matches;
        setMatches(workspace.matches);
        setAccess('ready');
      } catch (error) {
        if (active) {
          setAccessError(error instanceof Error ? error.message : 'Could not connect to Supabase.');
          setAccess('error');
        }
      }
    };
    void check();
    const { data: { subscription } } = db.auth.onAuthStateChange(event => {
      // Second signal, in case the fragment was consumed before we read it.
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') {
        // Keep Supabase calls outside the auth callback.
        window.setTimeout(() => setRefreshKey(value => value + 1), 0);
      }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [refreshKey]);

  React.useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (operations.current.length) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const flushWrites = async () => {
    if (flushing.current) return;
    flushing.current = true;
    while (operations.current.length) {
      try {
        await operations.current[0].run();
        operations.current.shift();
        setPendingWrites(operations.current.length);
        setSyncError('');
      } catch (error) {
        setSyncError(error instanceof Error ? error.message : 'Could not save changes.');
        break;
      }
    }
    flushing.current = false;
  };

  const queueWrite = (key: string, operation: () => Promise<void>) => {
    // Keep the newest snapshot when a match changes rapidly (for example, notes).
    const replaceAt = operations.current.findIndex((item, index) =>
      index >= (flushing.current ? 1 : 0) && item.key === key);
    if (replaceAt >= 0) operations.current[replaceAt] = { key, run: operation };
    else operations.current.push({ key, run: operation });
    setPendingWrites(operations.current.length);
    void flushWrites();
  };

  const replaceMatches = (next: Match[]) => {
    matchesRef.current = next;
    setMatches(next);
  };

  const handleStartMatch = (config: MatchConfig) => {
    if (config.existingMatchId) {
      // Handle saving edited settings for an existing match
      const updatedMatches = matchesRef.current.map(m => {
        if (m.id === config.existingMatchId) {
           const finalScore = getFinalScoreString(m.points, config);
           const details = getScoreDetails(m.points, config);
           return { ...m, config, finalScore, isCompleted: details.isMatchOver };
        }
        return m;
      });
      replaceMatches(updatedMatches);
      const updatedMatch = updatedMatches.find(m => m.id === config.existingMatchId);
      if (updatedMatch && sessionUser) queueWrite(`match:${updatedMatch.id}`, () => upsertMatch(sessionUser.id, updatedMatch));
      
      // If we were editing from viewing, update viewing state
      if (viewingMatch && viewingMatch.id === config.existingMatchId) {
        setViewingMatch(updatedMatch || null);
      }

      // If we were editing an ACTIVE match, update the active config state
      if (activeMatchId === config.existingMatchId) {
        setActiveMatchConfig(config);
      }
      
      setEditingSettingsMatch(null);
      setIsSettingUp(false);
      return;
    }

    const newId = crypto.randomUUID();
    const newMatch: Match = {
      id: newId,
      date: new Date().toISOString(),
      config: config,
      points: [],
      isCompleted: false,
      finalScore: "0-0 (0-0)",
      notes: ""
    };
    
    replaceMatches([newMatch, ...matchesRef.current]);
    if (sessionUser) queueWrite(`match:${newMatch.id}`, () => upsertMatch(sessionUser.id, newMatch));

    setActiveMatchConfig(config);
    setActiveMatchId(newId);
    setIsSettingUp(false);
    setActiveTab(Tab.Active);
  };

  const handleResumeMatch = (match: Match) => {
    setActiveMatchConfig(match.config);
    setActiveMatchId(match.id);
    setActiveTab(Tab.Active);
  };

  const handleFinishMatch = (points: Point[]) => {
    if (!activeMatchId || !activeMatchConfig) return;

    const finalScore = getFinalScoreString(points, activeMatchConfig);

    const updatedMatches = matchesRef.current.map(m => 
      m.id === activeMatchId 
        ? { ...m, points, isCompleted: true, finalScore } 
        : m
    );

    replaceMatches(updatedMatches);
    const updatedMatch = updatedMatches.find(m => m.id === activeMatchId);
    if (updatedMatch && sessionUser) queueWrite(`match:${updatedMatch.id}`, () => upsertMatch(sessionUser.id, updatedMatch));

    setActiveMatchConfig(null);
    setActiveMatchId(null);
    setActiveTab(Tab.Matches);
  };

  const handlePauseMatch = (points: Point[]) => {
    const id = activeMatchId || viewingMatch?.id;
    const config = activeMatchConfig || viewingMatch?.config;
    if (!id || !config) return;

    const currentScore = getFinalScoreString(points, config);

    const updatedMatches = matchesRef.current.map(m => 
      m.id === id 
        ? { ...m, points, finalScore: currentScore } 
        : m
    );

    replaceMatches(updatedMatches);
    const updatedMatch = updatedMatches.find(m => m.id === id);
    if (updatedMatch && sessionUser) queueWrite(`match:${updatedMatch.id}`, () => upsertMatch(sessionUser.id, updatedMatch));

    // If we're coming from viewing/editing a completed match, update that state too
    if (viewingMatch && viewingMatch.id === id) {
      setViewingMatch(updatedMatches.find(m => m.id === id)!);
    }
  };

  const handleUpdatePoints = (points: Point[]) => {
    const id = activeMatchId || viewingMatch?.id;
    const config = activeMatchConfig || viewingMatch?.config;
    if (!id || !config) return;

    const currentScore = getFinalScoreString(points, config);
    const details = getScoreDetails(points, config);

    const updatedMatches = matchesRef.current.map(m => 
      m.id === id 
        ? { ...m, points, finalScore: currentScore, isCompleted: details.isMatchOver } 
        : m
    );

    replaceMatches(updatedMatches);
    const updatedMatch = updatedMatches.find(m => m.id === id);
    if (updatedMatch && sessionUser) queueWrite(`match:${updatedMatch.id}`, () => upsertMatch(sessionUser.id, updatedMatch));

    if (viewingMatch && viewingMatch.id === id) {
       setViewingMatch(updatedMatches.find(m => m.id === id)!);
    }
  };

  const handleUpdateNotes = (notes: string) => {
    const id = activeMatchId || viewingMatch?.id;
    if (!id) return;

    const updatedMatches = matchesRef.current.map(m => 
      m.id === id ? { ...m, notes } : m
    );

    replaceMatches(updatedMatches);
    const updatedMatch = updatedMatches.find(m => m.id === id);
    if (updatedMatch && sessionUser) queueWrite(`match:${updatedMatch.id}`, () => upsertMatch(sessionUser.id, updatedMatch));

    if (viewingMatch && viewingMatch.id === id) {
      setViewingMatch(prev => prev ? { ...prev, notes } : null);
    }
  };

  const handleSavePlayer = (playerData: Omit<Player, 'id'>) => {
    let updated: Player[];
    if (editingPlayer) {
      updated = players.map(p => p.id === editingPlayer.id ? { ...p, ...playerData } : p);
    } else {
      const newPlayer: Player = {
        ...playerData,
        id: crypto.randomUUID(),
      };
      updated = [...players, newPlayer];
    }
    setPlayers(updated);
    const savedPlayer = editingPlayer
      ? updated.find(p => p.id === editingPlayer.id)
      : updated[updated.length - 1];
    if (savedPlayer && sessionUser) {
      if (savedPlayer.isSaved) queueWrite(`player:${savedPlayer.id}`, () => upsertPlayer(sessionUser.id, savedPlayer));
      else if (editingPlayer?.isSaved) queueWrite(`player:${savedPlayer.id}`, () => removePlayer(sessionUser.id, savedPlayer.id));
    }
    setIsAddingPlayer(false);
    setEditingPlayer(null);
  };

  const handleDeletePlayer = (id: string) => {
    const updated = players.filter(p => p.id !== id);
    setPlayers(updated);
    if (sessionUser) queueWrite(`player:${id}`, () => removePlayer(sessionUser.id, id));
  };

  const handleDeleteMatch = (id: string) => {
    replaceMatches(matchesRef.current.filter(m => m.id !== id));
    if (sessionUser) queueWrite(`match:${id}`, () => removeMatch(sessionUser.id, id));
    if (activeMatchId === id) {
      setActiveMatchId(null);
      setActiveMatchConfig(null);
    }
  };

  const handleStartNewSetup = () => {
    // Before starting new setup, clear out any transient unsaved players
    setPlayers(prev => prev.filter(p => p.isSaved));
    setIsSettingUp(true);
  };

  const signOut = async () => {
    if (operations.current.length) {
      window.alert('Some changes have not reached the database. Retry saving before signing out.');
      return;
    }
    if (window.confirm('Sign out of NTP Analytics?')) await supabase?.auth.signOut();
  };

  const syncBanner = (pendingWrites || syncError) ? (
    <div role={syncError ? 'alert' : 'status'} className={`fixed top-2 left-2 right-2 max-w-md mx-auto z-[100] rounded-xl px-4 py-3 text-sm shadow-lg ${syncError ? 'bg-red-700 text-white' : 'bg-[#1C1C1E] text-white'}`}>
      {syncError ? `Changes not saved: ${syncError}` : `Saving ${pendingWrites} change${pendingWrites === 1 ? '' : 's'}…`}
      {syncError && <button className="ml-3 underline font-bold" onClick={() => void flushWrites()}>Retry</button>}
    </div>
  ) : null;

  if (!supabase) {
    return <div className="min-h-screen bg-iosBg p-8 flex items-center justify-center text-center">
      <div><h1 className="text-xl font-bold mb-3">NTP Analytics is not configured</h1>
      <p>Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the deployment environment.</p></div>
    </div>;
  }

  if (recovering) {
    return (
      <ResetPasswordView
        onDone={() => { setRecovering(false); setRefreshKey(value => value + 1); }}
      />
    );
  }

  if (access === 'checking') {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center mb-4">
          <i className="fa-solid fa-spinner animate-spin text-[#0F5CCE] text-2xl"></i>
        </div>
        <p className="text-[#8E8E93] text-sm font-semibold">{ssoBusy ? 'Signing you in…' : 'Verifying session...'}</p>
      </div>
    );
  }

  if (access === 'error') {
    return <div className="min-h-screen bg-iosBg p-8 flex flex-col items-center justify-center text-center gap-4">
      <h1 className="text-xl font-bold">Could not load Analytics</h1>
      <p role="alert" className="text-red-700">{accessError}</p>
      <button className="px-5 py-3 bg-primary text-white rounded-xl" onClick={() => setRefreshKey(value => value + 1)}>Retry</button>
      <button className="text-primary underline" onClick={() => void signOut()}>Sign out</button>
    </div>;
  }

  if (access === 'signedOut' || !sessionUser) {
    return (
      <>{syncBanner}
      <AuthView
        onAuthSuccess={() => setRefreshKey(value => value + 1)}
        handoffError={handoffError}
      />
      </>
    );
  }

  if (isAddingPlayer || editingPlayer) {
    return (
      <>{syncBanner}
      <AddPlayerView 
        playerToEdit={editingPlayer || undefined}
        onSave={handleSavePlayer} 
        onCancel={() => {
          setIsAddingPlayer(false);
          setEditingPlayer(null);
        }} 
      />
      </>
    );
  }

  // Edit settings takes precedence over display
  if (isSettingUp || editingSettingsMatch) {
    const editConfig = editingSettingsMatch ? { ...editingSettingsMatch.config, existingMatchId: editingSettingsMatch.id } : undefined;
    return (
      <>{syncBanner}
      <SetupView 
        players={players} 
        onStartMatch={handleStartMatch} 
        onCancel={() => { setIsSettingUp(false); setEditingSettingsMatch(null); }} 
        onAddNewPlayer={() => setIsAddingPlayer(true)}
        initialConfig={editConfig}
      />
      </>
    );
  }

  if (viewingMatch) {
    return (
      <>{syncBanner}
      <ActiveMatchView 
        config={viewingMatch.config} 
        players={players} 
        initialPoints={viewingMatch.points}
        initialNotes={viewingMatch.notes}
        onCancel={() => setViewingMatch(null)}
        onUndo={handleUpdatePoints}
        onPause={handlePauseMatch}
        onUpdateNotes={handleUpdateNotes}
        onEditSettings={() => setEditingSettingsMatch(viewingMatch)}
        isReadOnly={false}
      />
      </>
    );
  }

  if (activeTab === Tab.Active && activeMatchConfig) {
    const currentMatch = matches.find(m => m.id === activeMatchId);
    return (
      <>{syncBanner}
      <ActiveMatchView 
        config={activeMatchConfig} 
        players={players} 
        initialPoints={currentMatch?.points || []}
        initialNotes={currentMatch?.notes || ""}
        onFinish={handleFinishMatch} 
        onPause={handlePauseMatch}
        onUndo={handleUpdatePoints}
        onUpdateNotes={handleUpdateNotes}
        onEditSettings={() => setEditingSettingsMatch(currentMatch || null)}
        onCancel={() => { setActiveMatchConfig(null); setActiveTab(Tab.Matches); }} 
      />
      </>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} onSignOut={signOut}>
      {syncBanner}
      {activeTab === Tab.Matches && (
        <MatchesView 
          matches={matches} 
          players={players} 
          onNewMatch={handleStartNewSetup} 
          onAddPlayer={() => setIsAddingPlayer(true)}
          onDeleteMatch={handleDeleteMatch}
          onViewMatch={(match) => {
            if (match.isCompleted) {
              setViewingMatch(match);
            } else {
              handleResumeMatch(match);
            }
          }}
        />
      )}
      {activeTab === Tab.Players && (
        <PlayersView 
          players={players} 
          onAddPlayer={() => setIsAddingPlayer(true)}
          onEditPlayer={(player) => setEditingPlayer(player)}
          onDeletePlayer={handleDeletePlayer}
        />
      )}
      {activeTab === Tab.Active && !activeMatchConfig && (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-iosBg">
           <div className="w-24 h-24 bg-white rounded-3xl shadow-lg flex items-center justify-center mb-6">
              <i className="fa-solid fa-tennis-ball text-primary text-5xl"></i>
           </div>
           <h2 className="text-2xl font-bold mb-2">No Active Match</h2>
           <p className="text-iosGray mb-8">Start a new match or resume an incomplete one from the Matches list.</p>
           <button 
             onClick={handleStartNewSetup}
             className="w-full max-w-xs py-4 bg-primary text-white font-bold rounded-2xl shadow-xl active:scale-95 transition-transform"
           >
             Start New Match
           </button>
        </div>
      )}
    </Layout>
  );
};

export default App;
