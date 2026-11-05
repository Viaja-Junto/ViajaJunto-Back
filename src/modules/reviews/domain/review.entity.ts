export interface Review {
  id: string;
  userId: string;
  touristSpotId: string;
  /** Whole stars, 1 to 5. */
  rating: number;
  comment: string | null;
  /** The day of the visit, at midnight UTC. */
  visitedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
