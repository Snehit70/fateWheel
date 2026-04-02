import type { HydratedDocument, Model, Types } from 'mongoose';

import type {
  AdminAction,
  BetOutcome,
  BetStatus,
  BetType,
  BetValue,
  TransactionType,
  UserRole,
  WheelColor,
} from './game';

export interface UserAttrs {
  username: string;
  password: string;
  balance: number;
  role: UserRole;
  createdAt: Date;
  updatedAt?: Date;
}

export type UserDocument = HydratedDocument<UserAttrs>;

export interface BetAttrs {
  user: Types.ObjectId;
  username: string;
  type: BetType;
  value: BetValue;
  amount: number;
  result?: BetOutcome;
  payout: number;
  balanceAfter?: number;
  gameResult?: {
    number: number;
    color: WheelColor;
  };
  status: BetStatus;
  roundId?: string;
  createdAt: Date;
}

export type BetDocument = HydratedDocument<BetAttrs>;

export interface TransactionAttrs {
  user: Types.ObjectId;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  description?: string;
  createdAt: Date;
}

export type TransactionDocument = HydratedDocument<TransactionAttrs>;

export interface AdminLogAttrs {
  adminId: Types.ObjectId;
  action: AdminAction;
  targetUserId: Types.ObjectId;
  targetUsername: string;
  details?: string;
  reason?: string;
  createdAt: Date;
}

export type AdminLogDocument = HydratedDocument<AdminLogAttrs>;

export interface GameResultAttrs {
  roundId: string;
  roundNumber: number;
  number: number;
  color: WheelColor;
  createdAt: Date;
  stats?: {
    totalBets?: number;
    totalWagered?: number;
    totalPayout?: number;
    netProfit?: number;
    uniqueUsers?: number;
  };
}

export type GameResultDocument = HydratedDocument<GameResultAttrs>;

export interface GameStatsAttrs {
  totalUsers: number;
  pendingUsers: number;
  netProfit: number;
  totalBets: number;
  totalWagered: number;
  lastDate: string;
  dailyNonce: number;
  withdrawalLockUntil?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GameStatsModel extends Model<GameStatsAttrs> {
  getStats(): Promise<GameStatsDocument>;
}

export type GameStatsDocument = HydratedDocument<GameStatsAttrs>;
