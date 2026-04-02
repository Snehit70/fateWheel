export type WheelColor = 'green' | 'red' | 'black';
export type BetParity = 'even' | 'odd';
export type BetType = 'number' | 'color' | 'type';
export type BetValue = number | WheelColor | BetParity;
export type GamePhase = 'WAITING' | 'SPINNING' | 'RESULT';

export interface WheelSegment {
  number: number;
  color: WheelColor;
}

export interface ActiveBet {
  userId: string;
  username: string;
  type: BetType;
  value: BetValue;
  amount: number;
  _id?: string;
}

export interface SocketAuthUser {
  id: string;
  role: string;
  username?: string;
}

export interface AuthTokenPayload {
  user: SocketAuthUser;
  iat?: number;
  exp?: number;
}

export interface HistoryRecord {
  createdAt: Date | string;
  roundId?: string;
}

export type UserRole = 'user' | 'admin';
export type BetStatus = 'active' | 'completed' | 'refunded' | 'cancelled';
export type BetOutcome = 'win' | 'loss';
export type AdminAction = 'delete_user' | 'update_balance' | 'withdraw_profit' | 'update_credentials';
export type TransactionType = 'bet' | 'win' | 'deposit' | 'withdraw' | 'adjustment';

export interface SanitizedBetData {
  type?: unknown;
  value?: unknown;
  amount?: unknown;
}

export interface GameStateSnapshot {
  state: GamePhase;
  endTime: number;
  currentRoundId: string | null;
  roundNumber: number;
  result: WheelSegment | null;
}
