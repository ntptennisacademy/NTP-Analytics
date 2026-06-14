import { Point, MatchConfig, Outcome, ShotKind } from '../types';

export const POINT_VALUES = ['0', '15', '30', '40', 'Ad'];

export interface SetScore {
  p1: number;
  p2: number;
}

export interface CurrentScore {
  p1Points: string;
  p2Points: string;
  p1Games: number;
  p2Games: number;
  p1Sets: number;
  p2Sets: number;
  setHistory: SetScore[];
  servingPlayerId: string;
  isGameOver: boolean;
  isSetOver: boolean;
  isMatchOver: boolean;
  isTieBreak: boolean;
  isSuperTieBreak: boolean;
}

export function calculateNewScore(
  current: CurrentScore,
  winnerId: string,
  p1Id: string,
  p2Id: string,
  config: MatchConfig
): CurrentScore {
  let { p1Points, p2Points, p1Games, p2Games, p1Sets, p2Sets, servingPlayerId, setHistory, isTieBreak, isSuperTieBreak } = current;
  const isP1 = winnerId === p1Id;
  
  if (isTieBreak) {
    let p1P = parseInt(p1Points) || 0;
    let p2P = parseInt(p2Points) || 0;
    if (isP1) p1P++; else p2P++;
    
    // Target is 10 for super tiebreak, 7 for regular tiebreak
    const target = isSuperTieBreak ? 10 : 7;
    
    if ((p1P >= target || p2P >= target) && Math.abs(p1P - p2P) >= 2) {
      let finalP1Games = p1Games;
      let finalP2Games = p2Games;
      if (isP1) finalP1Games++; else finalP2Games++;
      
      return awardSet({ ...current, p1Points: p1P.toString(), p2Points: p2P.toString(), p1Games: finalP1Games, p2Games: finalP2Games }, isP1 ? p1Id : p2Id, p1Id, p2Id, config, true);
    }
    
    const totalPoints = p1P + p2P;
    if (totalPoints % 2 === 1) {
       servingPlayerId = (servingPlayerId === p1Id) ? p2Id : p1Id;
    }
    return { ...current, p1Points: p1P.toString(), p2Points: p2P.toString(), servingPlayerId };
  }

  if (config.adScoring) {
    if (isP1) {
      if (p1Points === '40') {
        if (p2Points === 'Ad') p2Points = '40';
        else if (p2Points === '40') p1Points = 'Ad';
        else return awardGame(current, p1Id, p1Id, p2Id, config);
      } else if (p1Points === 'Ad') {
        return awardGame(current, p1Id, p1Id, p2Id, config);
      } else {
        p1Points = nextPoint(p1Points);
      }
    } else {
      if (p2Points === '40') {
        if (p1Points === 'Ad') p1Points = '40';
        else if (p1Points === '40') p2Points = 'Ad';
        else return awardGame(current, p2Id, p1Id, p2Id, config);
      } else if (p2Points === 'Ad') {
        return awardGame(current, p2Id, p1Id, p2Id, config);
      } else {
        p2Points = nextPoint(p2Points);
      }
    }
  } else {
    if (isP1) {
      if (p1Points === '40') return awardGame(current, p1Id, p1Id, p2Id, config);
      p1Points = nextPoint(p1Points);
    } else {
      if (p2Points === '40') return awardGame(current, p2Id, p1Id, p2Id, config);
      p2Points = nextPoint(p2Points);
    }
  }
  return { ...current, p1Points, p2Points };
}

function nextPoint(p: string): string {
  if (p === '0') return '15';
  if (p === '15') return '30';
  if (p === '30') return '40';
  return '0';
}

function awardGame(current: CurrentScore, winnerId: string, p1Id: string, p2Id: string, config: MatchConfig): CurrentScore {
  let { p1Games, p2Games, servingPlayerId } = current;
  if (winnerId === p1Id) p1Games++; else p2Games++;
  
  const p1Points = '0';
  const p2Points = '0';
  const nextServingPlayerId = servingPlayerId === p1Id ? p2Id : p1Id;
  const gamesNeeded = config.gamesPerSet;

  const updatedWithGame: CurrentScore = {
    ...current,
    p1Points,
    p2Points,
    p1Games,
    p2Games,
    servingPlayerId: nextServingPlayerId
  };

  if (config.tieBreak && p1Games === gamesNeeded && p2Games === gamesNeeded) {
    return { ...updatedWithGame, isTieBreak: true };
  }

  if (p1Games >= gamesNeeded && (Math.abs(p1Games - p2Games) >= 2 || (!config.tieBreak && p1Games > gamesNeeded))) {
    return awardSet(updatedWithGame, p1Id, p1Id, p2Id, config, false);
  } else if (p2Games >= gamesNeeded && (Math.abs(p2Games - p1Games) >= 2 || (!config.tieBreak && p2Games > gamesNeeded))) {
    return awardSet(updatedWithGame, p2Id, p1Id, p2Id, config, false);
  }

  return updatedWithGame;
}

function awardSet(current: CurrentScore, winnerId: string, p1Id: string, p2Id: string, config: MatchConfig, viaTieBreak: boolean): CurrentScore {
  let { p1Games, p2Games, p1Sets, p2Sets, setHistory, servingPlayerId } = current;
  if (winnerId === p1Id) p1Sets++; else p2Sets++;
  const newHistory = [...setHistory, { p1: p1Games, p2: p2Games }];
  
  const setsToWinCount = typeof config.setsToWin === 'number' ? Math.ceil(config.setsToWin / 2) : 1;
  const isMatchOver = p1Sets >= setsToWinCount || p2Sets >= setsToWinCount;

  // Handle transitions to super tiebreak for deciding set
  const setsPlayed = p1Sets + p2Sets;
  const isEnteringDecidingSet = !isMatchOver && setsPlayed === (typeof config.setsToWin === 'number' ? config.setsToWin - 1 : 0);
  const isSuperTieBreakNext = isEnteringDecidingSet && config.decidingSetFormat === 'Super Tiebreak';

  return { 
    ...current, 
    p1Points: '0', 
    p2Points: '0', 
    p1Games: 0, 
    p2Games: 0, 
    p1Sets, 
    p2Sets, 
    setHistory: newHistory, 
    servingPlayerId,
    isMatchOver, 
    isSetOver: true,
    isTieBreak: isSuperTieBreakNext, 
    isSuperTieBreak: isSuperTieBreakNext
  };
}

export function getScoreDetails(points: Point[], config: MatchConfig): CurrentScore {
  let current: CurrentScore = {
    p1Points: '0', p2Points: '0', p1Games: 0, p2Games: 0, p1Sets: 0, p2Sets: 0,
    setHistory: [], servingPlayerId: config.initialServerId, isGameOver: false, isSetOver: false, isMatchOver: false, isTieBreak: false, isSuperTieBreak: false
  };
  points.forEach(p => {
    current = calculateNewScore(current, p.winnerId, config.p1Id, config.p2Id, config);
  });
  return current;
}

export function getFinalScoreString(points: Point[], config: MatchConfig): string {
  const current = getScoreDetails(points, config);
  const isSingleSet = config.setsToWin === 1 || config.setsToWin === 'Pro Set' || config.setsToWin === 'Fast4';

  if (isSingleSet) {
    if (current.setHistory.length > 0) {
       return `${current.setHistory[0].p1}-${current.setHistory[0].p2}`;
    }
    return `${current.p1Games}-${current.p2Games}`;
  }
  
  const setsString = current.setHistory.map(s => `${s.p1}-${s.p2}`).join(', ');
  const currentGames = (!current.isMatchOver && (current.p1Games > 0 || current.p2Games > 0)) ? `${current.p1Games}-${current.p2Games}` : '';
  
  let result = `${current.p1Sets}-${current.p2Sets}`;
  if (setsString || currentGames) {
    result += ` (${setsString}${setsString && currentGames ? ', ' : ''}${currentGames})`;
  }
  return result;
}

export interface DetailedStat {
  won: number;
  total: number;
  pct: number;
}

export interface ShotStatRow {
  label: string;
  p1: number;
  p2: number;
}

export function calculateStats(points: Point[], p1Id: string, p2Id: string) {
  const getStats = (playerId: string) => {
    const opponentId = playerId === p1Id ? p2Id : p1Id;
    const servicePoints = points.filter(p => p.serverPlayerId === playerId);
    const returnPoints = points.filter(p => p.serverPlayerId === opponentId);
    
    const firstServesInCount = servicePoints.filter(p => p.serveNumber === 1 && p.outcome !== 'Double Fault').length;
    const firstServesTotalCount = servicePoints.length; 
    const secondServesInCount = servicePoints.filter(p => p.serveNumber === 2 && p.outcome !== 'Double Fault').length;
    const secondServesTotalCount = servicePoints.filter(p => p.serveNumber === 2).length;

    const createDetailed = (won: number, total: number): DetailedStat => ({
      won,
      total,
      pct: total > 0 ? (won / total) * 100 : 0
    });

    const firstServePointsWonCount = servicePoints.filter(p => p.serveNumber === 1 && p.winnerId === playerId).length;
    const firstServePointsTotalCount = servicePoints.filter(p => p.serveNumber === 1).length;
    const secondServePointsWonCount = servicePoints.filter(p => p.serveNumber === 2 && p.winnerId === playerId).length;
    const secondServePointsTotalCount = servicePoints.filter(p => p.serveNumber === 2).length;

    const isBP = (p: Point, serverId: string) => {
      const s = p.scoreAtStart;
      const isP1Serving = serverId === p1Id;
      if (isP1Serving) {
        return (s.p2Points === '40' && s.p1Points !== '40' && s.p1Points !== 'Ad') || (s.p2Points === 'Ad');
      } else {
        return (s.p1Points === '40' && s.p2Points !== '40' && s.p2Points !== 'Ad') || (s.p1Points === 'Ad');
      }
    };

    const opponentBPOpps = servicePoints.filter(p => isBP(p, playerId));
    const breakPointsSavedCount = opponentBPOpps.filter(p => p.winnerId === playerId).length;
    const firstReturnPointsWonCount = returnPoints.filter(p => p.serveNumber === 1 && p.winnerId === playerId).length;
    const firstReturnPointsTotalCount = returnPoints.filter(p => p.serveNumber === 1).length;
    const secondReturnPointsWonCount = returnPoints.filter(p => p.serveNumber === 2 && p.winnerId === playerId).length;
    const secondReturnPointsTotalCount = returnPoints.filter(p => p.serveNumber === 2).length;
    const myBPOpps = returnPoints.filter(p => isBP(p, opponentId));
    const breakPointsWonCount = myBPOpps.filter(p => p.winnerId === playerId).length;

    return {
      firstServePercentage: createDetailed(firstServesInCount, firstServesTotalCount),
      secondServePercentage: createDetailed(secondServesInCount, secondServesTotalCount),
      aces: points.filter(p => p.winnerId === playerId && p.outcome === 'Ace').length,
      doubleFaults: points.filter(p => p.loserId === playerId && p.outcome === 'Double Fault').length,
      winners: points.filter(p => p.winnerId === playerId && p.outcome === 'Winner').length,
      unforcedErrors: points.filter(p => p.loserId === playerId && p.outcome === 'Unforced Error').length,
      forcedErrors: points.filter(p => p.loserId === playerId && p.outcome === 'Forced Error').length,
      firstServePointsWon: createDetailed(firstServePointsWonCount, firstServePointsTotalCount),
      secondServePointsWon: createDetailed(secondServePointsWonCount, secondServePointsTotalCount),
      breakPointsSaved: createDetailed(breakPointsSavedCount, opponentBPOpps.length),
      firstReturnPointsWon: createDetailed(firstReturnPointsWonCount, firstReturnPointsTotalCount),
      secondReturnPointsWon: createDetailed(secondReturnPointsWonCount, secondReturnPointsTotalCount),
      breakPointsWon: createDetailed(breakPointsWonCount, myBPOpps.length),
      totalPointsWon: points.filter(p => p.winnerId === playerId).length,
      pointsWonPct: points.length > 0 ? (points.filter(p => p.winnerId === playerId).length / points.length) * 100 : 0,
      touches04: createDetailed(
        points.filter(p => p.winnerId === playerId && p.rallyLength <= 4).length,
        points.filter(p => p.rallyLength <= 4).length
      ),
      touches58: createDetailed(
        points.filter(p => p.winnerId === playerId && p.rallyLength >= 5 && p.rallyLength <= 8).length,
        points.filter(p => p.rallyLength >= 5 && p.rallyLength <= 8).length
      ),
      touches9plus: createDetailed(
        points.filter(p => p.winnerId === playerId && p.rallyLength >= 9).length,
        points.filter(p => p.rallyLength >= 9).length
      )
    };
  };

  return {
    p1: getStats(p1Id),
    p2: getStats(p2Id)
  };
}

export function calculateShotBreakdown(points: Point[], p1Id: string, p2Id: string, outcomeType: Outcome): ShotStatRow[] {
  const rows: ShotStatRow[] = [];
  const relevantPoints = points.filter(p => p.outcome === outcomeType);
  const shotKeys = [
    { label: 'Forehand', side: 'Forehand', kind: 'Regular' },
    { label: 'Forehand Volley', side: 'Forehand', kind: 'Volley' },
    { label: 'Forehand Slice', side: 'Forehand', kind: 'Slice' },
    { label: 'Forehand Return', side: 'Forehand', kind: 'Return' },
    { label: 'Inside-In', side: 'Forehand', kind: 'Inside-In' },
    { label: 'Inside-Out', side: 'Forehand', kind: 'Inside-Out' },
    { label: 'Backhand', side: 'Backhand', kind: 'Regular' },
    { label: 'Backhand Slice', side: 'Backhand', kind: 'Slice' },
    { label: 'Backhand Return', side: 'Backhand', kind: 'Return' },
    { label: 'Backhand Volley', side: 'Backhand', kind: 'Volley' },
    { label: 'Approach', side: '', kind: 'Approach' },
    { label: 'Drop Shot', side: '', kind: 'Drop Shot' },
  ];

  shotKeys.forEach(k => {
    const p1Count = relevantPoints.filter(p => {
      const isRelevant = (outcomeType === 'Winner' || outcomeType === 'Ace') ? p.winnerId === p1Id : p.loserId === p1Id;
      if (!isRelevant) return false;
      const sideMatch = !k.side || p.shotSide === k.side;
      const kindMatch = !k.kind || p.shotKind === k.kind || (k.kind === 'Regular' && !p.shotKind);
      return sideMatch && kindMatch;
    }).length;

    const p2Count = relevantPoints.filter(p => {
      const isRelevant = (outcomeType === 'Winner' || outcomeType === 'Ace') ? p.winnerId === p2Id : p.loserId === p2Id;
      if (!isRelevant) return false;
      const sideMatch = !k.side || p.shotSide === k.side;
      const kindMatch = !k.kind || p.shotKind === k.kind || (k.kind === 'Regular' && !p.shotKind);
      return sideMatch && kindMatch;
    }).length;

    if (p1Count > 0 || p2Count > 0) {
      rows.push({ label: k.label, p1: p1Count, p2: p2Count });
    }
  });

  const totalP1 = relevantPoints.filter(p => (outcomeType === 'Winner' || outcomeType === 'Ace') ? p.winnerId === p1Id : p.loserId === p1Id).length;
  const totalP2 = relevantPoints.filter(p => (outcomeType === 'Winner' || outcomeType === 'Ace') ? p.winnerId === p2Id : p.loserId === p2Id).length;
  rows.push({ label: 'Total', p1: totalP1, p2: totalP2 });
  return rows;
}

export function calculateServePlacementStats(points: Point[], playerId: string) {
  const servicePoints = points.filter(p => p.serverPlayerId === playerId && p.servePlacement);
  
  const stats: any = {
    Deuce: { T: { total: 0, won: 0, aces: 0 }, Body: { total: 0, won: 0, aces: 0 }, Wide: { total: 0, won: 0, aces: 0 } },
    Ad: { T: { total: 0, won: 0, aces: 0 }, Body: { total: 0, won: 0, aces: 0 }, Wide: { total: 0, won: 0, aces: 0 } }
  };

  servicePoints.forEach(p => {
    const court = p.courtSide || 'Deuce';
    const placement = p.servePlacement!;
    if (!stats[court]) stats[court] = { T: { total: 0, won: 0, aces: 0 }, Body: { total: 0, won: 0, aces: 0 }, Wide: { total: 0, won: 0, aces: 0 } };
    
    stats[court][placement].total++;
    if (p.winnerId === playerId) {
      stats[court][placement].won++;
    }
    if (p.winnerId === playerId && p.outcome === 'Ace') {
      stats[court][placement].aces++;
    }
  });

  return stats;
}

export function getCourtSide(p: Point): 'Deuce' | 'Ad' {
  const s = p.scoreAtStart;
  const getNum = (pts: string) => {
    if (pts === '0') return 0;
    if (pts === '15') return 1;
    if (pts === '30') return 2;
    if (pts === '40') return 3;
    if (pts === 'Ad') return 4;
    return parseInt(pts) || 0;
  };
  const total = getNum(s.p1Points) + getNum(s.p2Points);
  return total % 2 === 0 ? 'Deuce' : 'Ad';
}

export function calculateServeTypeStats(points: Point[], playerId: string) {
  const servicePoints = points.filter(p => p.serverPlayerId === playerId && p.serveType);
  const types: ('Flat' | 'Slice' | 'Kick')[] = ['Flat', 'Slice', 'Kick'];
  
  const stats: any = {};
  types.forEach(t => {
    const pts = servicePoints.filter(p => p.serveType === t);
    stats[t] = {
      total: pts.length,
      won: pts.filter(p => p.winnerId === playerId).length,
      aces: pts.filter(p => p.outcome === 'Ace').length
    };
  });
  return stats;
}

export function calculateDetailedShotStats(points: Point[], playerId: string) {
  const playerPoints = points.filter(p => (p.winnerId === playerId || p.loserId === playerId));
  
  const placementStats: Record<ShotLocation, { winners: number; total: number }> = {
    'Cross Court': { winners: 0, total: 0 },
    'Middle': { winners: 0, total: 0 },
    'Down the Line': { winners: 0, total: 0 }
  };

  const errorStats: Record<ErrorType, number> = {
    'Net': 0,
    'Long': 0,
    'Wide': 0
  };

  points.forEach(p => {
    // Placement tracking
    if (p.location) {
      const isWinnerShot = (p.outcome === 'Winner' || p.outcome === 'Ace');
      const isErrorShot = (p.outcome === 'Unforced Error' || p.outcome === 'Forced Error');
      const shotOwnerId = isWinnerShot ? p.winnerId : (isErrorShot ? p.loserId : null);

      if (shotOwnerId === playerId) {
        placementStats[p.location].total++;
        if (isWinnerShot) {
          placementStats[p.location].winners++;
        }
      }
    }

    // Error tracking
    if (p.loserId === playerId && p.errorType) {
      errorStats[p.errorType]++;
    }
  });

  return { placementStats, errorStats };
}

export function getPointDescription(p: Point, players: {id: string, name: string}[]): string {
  const winner = players.find(pl => pl.id === p.winnerId)?.name;
  const loser = players.find(pl => pl.id === p.loserId)?.name;

  if (p.outcome === 'Winner' || p.outcome === 'Ace') {
    if (p.shotSide || p.shotKind) {
        return `${winner} won the point with a ${p.location?.toLowerCase() || ''} ${p.shotSide?.toLowerCase() || ''} ${p.shotKind?.toLowerCase() || ''} winner`.replace(/\s+/g, ' ').trim();
    }
    return `${winner} won the point`;
  } else if (p.outcome === 'Double Fault') {
    return `${loser} lost the point with a ${p.errorType?.toLowerCase() || ''} double fault`.replace(/\s+/g, ' ').trim();
  } else {
    const outcomeLabel = p.outcome === 'Unforced Error' ? 'unforced error' : 'forced error';
    const detail = `${p.errorType || ''} ${p.location || ''} ${p.shotSide || ''} ${outcomeLabel}`.toLowerCase().replace(/\s+/g, ' ').trim();
    return `${loser} lost the point with a ${detail}`;
  }
}

// Fix redundant and potentially incorrect literal type comparisons
export function isWinningPointOfGame(p: Point, config: MatchConfig): boolean {
  const s = p.scoreAtStart;
  const winnerId = p.winnerId;
  const isP1 = winnerId === config.p1Id;
  if (config.adScoring) {
    if (isP1) {
      // P1 wins game if: (Has 40 AND P2 does not have 40 or Ad) OR (P1 has Ad)
      return (s.p1Points === '40' && s.p2Points !== '40' && s.p2Points !== 'Ad') || (s.p1Points === 'Ad');
    } else {
      // P2 wins game if: (Has 40 AND P1 does not have 40 or Ad) OR (P2 has Ad)
      return (s.p2Points === '40' && s.p1Points !== '40' && s.p1Points !== 'Ad') || (s.p2Points === 'Ad');
    }
  } else {
    return isP1 ? s.p1Points === '40' : s.p2Points === '40';
  }
}