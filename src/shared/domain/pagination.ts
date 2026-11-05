export interface PageRequest {
  skip: number;
  take: number;
}

export interface Page<T> {
  items: T[];
  total: number;
}
