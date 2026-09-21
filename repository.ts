import type { Match, Player } from './types';
import { supabase } from './supabaseClient';

function client() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

async function allRows(table: 'analytics_players' | 'analytics_matches', userId: string) {
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client().from(table).select('*')
      .eq('owner_id', userId).range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

export async function loadWorkspace(userId: string): Promise<{ players: Player[]; matches: Match[] }> {
  const [playerRows, matchRows] = await Promise.all([
    allRows('analytics_players', userId), allRows('analytics_matches', userId),
  ]);
  return {
    players: playerRows.map(row => ({
      id: row.id, name: row.name, team: row.team,
      hittingArm: row.hitting_arm, backhand: row.backhand,
      utrRating: Number(row.utr_rating), isSaved: row.is_saved,
    })),
    matches: matchRows.map(row => ({
      id: row.id, date: row.date, config: row.config,
      points: row.points, isCompleted: row.is_completed,
      finalScore: row.final_score, notes: row.notes,
    })).sort((a, b) => b.date.localeCompare(a.date)),
  };
}

export async function upsertPlayer(userId: string, player: Player) {
  const { error } = await client().from('analytics_players').upsert({
    owner_id: userId, id: player.id, name: player.name, team: player.team,
    hitting_arm: player.hittingArm, backhand: player.backhand,
    utr_rating: player.utrRating, is_saved: player.isSaved,
  }, { onConflict: 'owner_id,id' });
  if (error) throw error;
}

export async function removePlayer(userId: string, id: string) {
  const { error } = await client().from('analytics_players')
    .delete().eq('owner_id', userId).eq('id', id);
  if (error) throw error;
}

export async function upsertMatch(userId: string, match: Match) {
  const { error } = await client().from('analytics_matches').upsert({
    owner_id: userId, id: match.id, date: match.date,
    config: match.config, points: match.points,
    is_completed: match.isCompleted, final_score: match.finalScore,
    notes: match.notes || '',
  }, { onConflict: 'owner_id,id' });
  if (error) throw error;
}

export async function removeMatch(userId: string, id: string) {
  const { error } = await client().from('analytics_matches')
    .delete().eq('owner_id', userId).eq('id', id);
  if (error) throw error;
}
