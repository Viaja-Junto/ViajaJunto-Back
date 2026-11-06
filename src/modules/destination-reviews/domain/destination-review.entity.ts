export interface DestinationReview {
  id: string;
  userId: string;
  destinationId: string;
  rating: number;
  comment?: string | null;
  createdAt: Date;
}
