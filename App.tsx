import React from 'react';
import Layout from './components/Layout';
import { Tab, Player, Match, MatchConfig, Point } from './types';
import { loadPlayers, loadMatches, savePlayers, saveMatches } from './store';
import MatchesView from './views/MatchesView';
import PlayersView from './views/PlayersView';
import SetupView from './views/SetupView';
import ActiveMatchView from './views/ActiveMatchView';
import AddPlayerView from './views/AddPlayerView';
import { getFinalScoreString, getScoreDetails } from './logic/tennisLogic';
import { supabase } from './supabaseClient';
import { AuthView } from './views/AuthView';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<Tab>(Tab.Matches);
  const [players, setPlayers] = React.useState<Player[]>([]);
  const [matches, setMatches] = React.useState<Match[]>([]);
  const [isSettingUp, setIsSettingUp] = React.useState(false);
  const [isAddingPlayer, setIsAddingPlayer] = React.useState(false);
  const [editingPlayer, setEditingPlayer] = React.useState<Player | null>(null);
  const [activeMatchConfig, setActiveMatchConfig] = React.useState<MatchConfig | null>(null);
  const [activeMatchId, setActiveMatchId] = React.useState<string | null>(null);
  const [viewingMatch, setViewingMatch] = React.useState<Match | null>(null);
  const [editingSettingsMatch, setEditingSettingsMatch] = React.useState<Match | null>(null);

  const [sessionUser, setSessionUser] = React.useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = React.useState(true);

  const checkApproval = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('id', userId)
        .maybeSingle();
      return !!profile?.is_approved;
    } catch (err) {
      console.error("Failed to check approval:", err);
      return false;
    }
  };

  React.useEffect(() => {
    const checkInitialSession = async () => {
      try {
        const response = await supabase.auth.getSession();
        const session = response?.data?.session;
        if (session?.user) {
          const approved = await checkApproval(session.user.id);
          if (approved) {
            setSessionUser(session.user);
            setPlayers(loadPlayers());
            setMatches(loadMatches());
          } else {
            try {
              await supabase.auth.signOut();
            } catch (signOutErr) {
              console.error("Sign out on pending check failed:", signOutErr);
            }
            setSessionUser(null);
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setIsAuthChecking(false);
      }
    };

    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          const approved = await checkApproval(session.user.id);
          if (approved) {
            setSessionUser(session.user);
            setPlayers(loadPlayers());
            setMatches(loadMatches());
          } else {
            setSessionUser(null);
          }
        } else {
          setSessionUser(null);
        }
      } catch (err) {
        console.error("Auth state change error handled:", err);
        setSessionUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleStartMatch = (config: MatchConfig) => {
    if (config.existingMatchId) {
      // Handle saving edited settings for an existing match
      const updatedMatches = matches.map(m => {
        if (m.id === config.existingMatchId) {
           const finalScore = getFinalScoreString(m.points, config);
           const details = getScoreDetails(m.points, config);
           return { ...m, config, finalScore, isCompleted: details.isMatchOver };
        }
        return m;
      });
      setMatches(updatedMatches);
      saveMatches(updatedMatches);
      
      const updatedMatch = updatedMatches.find(m => m.id === config.existingMatchId);
      
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

    const newId = Date.now().toString();
    const newMatch: Match = {
      id: newId,
      date: new Date().toISOString(),
      config: config,
      points: [],
      isCompleted: false,
      finalScore: "0-0 (0-0)",
      notes: ""
    };
    
    const updated = [newMatch, ...matches];
    setMatches(updated);
    saveMatches(updated);

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

    const updatedMatches = matches.map(m => 
      m.id === activeMatchId 
        ? { ...m, points, isCompleted: true, finalScore } 
        : m
    );

    setMatches(updatedMatches);
    saveMatches(updatedMatches);

    setActiveMatchConfig(null);
    setActiveMatchId(null);
    setActiveTab(Tab.Matches);
  };

  const handlePauseMatch = (points: Point[]) => {
    const id = activeMatchId || viewingMatch?.id;
    const config = activeMatchConfig || viewingMatch?.config;
    if (!id || !config) return;

    const currentScore = getFinalScoreString(points, config);

    const updatedMatches = matches.map(m => 
      m.id === id 
        ? { ...m, points, finalScore: currentScore } 
        : m
    );

    setMatches(updatedMatches);
    saveMatches(updatedMatches);

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

    const updatedMatches = matches.map(m => 
      m.id === id 
        ? { ...m, points, finalScore: currentScore, isCompleted: details.isMatchOver } 
        : m
    );

    setMatches(updatedMatches);
    saveMatches(updatedMatches);

    if (viewingMatch && viewingMatch.id === id) {
       setViewingMatch(updatedMatches.find(m => m.id === id)!);
    }
  };

  const handleUpdateNotes = (notes: string) => {
    const id = activeMatchId || viewingMatch?.id;
    if (!id) return;

    const updatedMatches = matches.map(m => 
      m.id === id ? { ...m, notes } : m
    );

    setMatches(updatedMatches);
    saveMatches(updatedMatches);

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
        id: Date.now().toString(),
      };
      updated = [...players, newPlayer];
    }
    setPlayers(updated);
    // Only persist players marked with isSaved: true
    savePlayers(updated.filter(p => p.isSaved));
    setIsAddingPlayer(false);
    setEditingPlayer(null);
  };

  const handleDeletePlayer = (id: string) => {
    const updated = players.filter(p => p.id !== id);
    setPlayers(updated);
    savePlayers(updated.filter(p => p.isSaved));
  };

  const handleDeleteMatch = (id: string) => {
    const updated = matches.filter(m => m.id !== id);
    setMatches(updated);
    saveMatches(updated);
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

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center mb-4">
          <i className="fa-solid fa-spinner animate-spin text-[#0F5CCE] text-2xl"></i>
        </div>
        <p className="text-[#8E8E93] text-sm font-semibold">Verifying session...</p>
      </div>
    );
  }

  if (!sessionUser) {
    return (
      <AuthView 
        onAuthSuccess={(user) => { 
          setSessionUser(user); 
          setPlayers(loadPlayers()); 
          setMatches(loadMatches()); 
        }} 
      />
    );
  }

  if (isAddingPlayer || editingPlayer) {
    return (
      <AddPlayerView 
        playerToEdit={editingPlayer || undefined}
        onSave={handleSavePlayer} 
        onCancel={() => {
          setIsAddingPlayer(false);
          setEditingPlayer(null);
        }} 
      />
    );
  }

  // Edit settings takes precedence over display
  if (isSettingUp || editingSettingsMatch) {
    const editConfig = editingSettingsMatch ? { ...editingSettingsMatch.config, existingMatchId: editingSettingsMatch.id } : undefined;
    return (
      <SetupView 
        players={players} 
        onStartMatch={handleStartMatch} 
        onCancel={() => { setIsSettingUp(false); setEditingSettingsMatch(null); }} 
        onAddNewPlayer={() => setIsAddingPlayer(true)}
        initialConfig={editConfig}
      />
    );
  }

  if (viewingMatch) {
    return (
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
    );
  }

  if (activeTab === Tab.Active && activeMatchConfig) {
    const currentMatch = matches.find(m => m.id === activeMatchId);
    return (
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
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
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