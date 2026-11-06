export const TRIP_STATUSES = ['PLANNING', 'CONFIRMED', 'COMPLETED'] as const;

export type TripStatus = (typeof TRIP_STATUSES)[number];

export type TripRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface Trip {
  id: string;
  name: string;
  description?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  status: TripStatus;
  createdBy: string;
  currency: string;
  inviteCode: string;
  createdAt: Date;
}

export interface UserTrip extends Trip {
  role: TripRole;
}
