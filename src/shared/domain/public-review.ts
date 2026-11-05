export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  authorName: string;
}
