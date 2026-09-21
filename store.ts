
import type { Player, Match } from './types';

const PLAYERS_KEY = 'ntp_stat_players';
const MATCHES_KEY = 'ntp_stat_matches';

// Legacy browser data is read only for an explicit, one-time import.
export function readLegacyData(): { players: Player[]; matches: Match[] } | null {
  try {
    const rawPlayers = localStorage.getItem(PLAYERS_KEY);
    const rawMatches = localStorage.getItem(MATCHES_KEY);
    if (!rawPlayers && !rawMatches) return null;
    const players = rawPlayers ? JSON.parse(rawPlayers) : [];
    const matches = rawMatches ? JSON.parse(rawMatches) : [];
    return parseBackup({ players, matches });
  } catch {
    return null;
  }
}

export function parseBackup(value: unknown): { players: Player[]; matches: Match[] } | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as { players?: unknown; matches?: unknown };
  if (!Array.isArray(data.players) || !Array.isArray(data.matches)) return null;
  const players = data.players as Player[];
  const matches = data.matches as Match[];
  if (!players.every(player => player && typeof player.id === 'string' &&
    typeof player.name === 'string' && player.name.trim() &&
    typeof player.team === 'string' &&
    ['Left', 'Right'].includes(player.hittingArm) &&
    ['One-Handed', 'Two-Handed'].includes(player.backhand) &&
    Number.isFinite(player.utrRating) && typeof player.isSaved === 'boolean')) return null;
  if (!matches.every(match => match && typeof match.id === 'string' &&
    typeof match.date === 'string' && !Number.isNaN(Date.parse(match.date)) &&
    match.config && typeof match.config === 'object' &&
    typeof match.config.p1Id === 'string' && typeof match.config.p2Id === 'string' &&
    Array.isArray(match.points) && typeof match.isCompleted === 'boolean' &&
    typeof match.finalScore === 'string' &&
    (match.notes === undefined || typeof match.notes === 'string'))) return null;
  return { players, matches };
}
