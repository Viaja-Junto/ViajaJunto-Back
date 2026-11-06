export interface Review {
  id: string;
  userId: string;
  touristSpotId: string;
  rating: number;
  comment: string | null;
  visitedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
