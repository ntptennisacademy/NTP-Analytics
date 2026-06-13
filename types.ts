export type HittingArm = 'Left' | 'Right';
export type BackhandType = 'One-Handed' | 'Two-Handed';
export type Outcome = 'Ace' | 'Winner' | 'Unforced Error' | 'Forced Error' | 'Double Fault';
export type ShotKind = 'Regular' | 'Return' | 'Inside-In' | 'Inside-Out' | 'Passing' | 'Approach' | 'Slice' | 'Volley' | 'Drop Shot' | 'Lob' | 'Overhead';
export type ShotLocation = 'Cross Court' | 'Middle' | 'Down the Line';
export type ErrorType = 'Long' | 'Net' | 'Wide';
export type ServePlacement = 'T' | 'Body' | 'Wide';
export type ServeType = 'Flat' | 'Slice' | 'Kick';
export type CourtSide = 'Deuce' | 'Ad';
export type CourtSurface = 'Hard' | 'Clay' | 'Grass';
export type CourtSpeed = 'Slow' | 'Neutral' | 'Fast';
export type CourtType = 'Indoor' | 'Outdoor';
export type ScoringType = 'Simple' | 'Shot Stats';
export type DecidingSetFormat = 'Full Set' | 'Super Tiebreak';

export interface Player {
  id: string;
  name: string;
  team: string;
  hittingArm: HittingArm;
  backhand: BackhandType;
  utrRating: number;
  isSaved: boolean;
}

export interface Point {
  winnerId: string;
  loserId: string;
  outcome: Outcome;
  serverPlayerId: string;
  serveNumber: 1 | 2;
  courtSide?: CourtSide;
  serveType?: ServeType;
  shotSide?: 'Forehand' | 'Backhand';
  shotKind?: ShotKind;
  location?: ShotLocation;
  errorType?: ErrorType;
  servePlacement?: ServePlacement;
  rallyLength: number;
  scoreAtStart: {
    p1Points: string;
    p2Points: string;
    p1Games: number;
    p2Games: number;
    p1Sets: number;
    p2Sets: number;
  };
}

export interface MatchConfig {
  p1Id: string;
  p2Id: string;
  p1Name?: string;
  p2Name?: string;
  initialServerId: string;
  scoringType: ScoringType;
  adScoring: boolean;
  tieBreak: boolean;
  setsToWin: 1 | 3 | 5 | 'Pro Set' | 'Fast4';
  gamesPerSet: number;
  decidingSetFormat: DecidingSetFormat;
  courtSurface: CourtSurface;
  courtSpeed: CourtSpeed;
  courtType: CourtType;
  description: string;
  city: string;
  state: string;
  temperature: string;
  humidity: string;
  round?: string;
  existingMatchId?: string;
  trackServe?: boolean;
  trackShotPlacement?: boolean;
  trackErrorType?: boolean;
}

export interface Match {
  id: string;
  date: string;
  config: MatchConfig;
  points: Point[];
  isCompleted: boolean;
  finalScore: string;
  notes?: string;
}

export enum Tab {
  Matches = 'Matches',
  Players = 'Players',
  Active = 'Active'
}