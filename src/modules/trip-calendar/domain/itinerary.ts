export interface ItineraryActivity {
  id: string;
  spotName: string;
  address: string | null;
  city: string;
  dateTime: Date | null;
  durationMinutes: number | null;
  expectedCost: number | null;
  status: string;
}

export interface ItineraryStop {
  id: string;
  destinationName: string;
  country: string;
  arrival: Date | null;
  departure: Date | null;
  description: string | null;
  activities: ItineraryActivity[];
}

export interface Itinerary {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  startDate: Date | null;
  endDate: Date | null;
  stops: ItineraryStop[];
}

export abstract class ItineraryRepository {
  abstract findByTrip(tripId: string): Promise<Itinerary | null>;
}
