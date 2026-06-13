
import { Player, Match, MatchConfig } from './types';

const PLAYERS_KEY = 'ntp_stat_players';
const MATCHES_KEY = 'ntp_stat_matches';

export const initialPlayers: Player[] = [];

export const loadPlayers = (): Player[] => {
  const saved = localStorage.getItem(PLAYERS_KEY);
  return saved ? JSON.parse(saved) : initialPlayers;
};

export const savePlayers = (players: Player[]) => {
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
};

export const loadMatches = (): Match[] => {
  const saved = localStorage.getItem(MATCHES_KEY);
  return saved ? JSON.parse(saved) : [];
};

export const saveMatches = (matches: Match[]) => {
  localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
};
