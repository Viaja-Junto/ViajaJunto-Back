export interface VisitedPlace {
  tripId: string;
  country: string | null;
  countryCode: string | null;
}

export interface VisitedCountry {
  country: string | null;
  countryCode: string | null;
  tripCount: number;
}

const clean = (value: string | null | undefined): string | null =>
  value?.trim() || null;

export function groupVisitedCountries(
  places: VisitedPlace[],
): VisitedCountry[] {
  const groups = new Map<
    string,
    { country: string | null; countryCode: string | null; trips: Set<string> }
  >();

  for (const place of places) {
    const country = clean(place.country);
    const countryCode = clean(place.countryCode)?.toUpperCase() ?? null;
    const key = countryCode ?? country?.toLowerCase();

    if (!key) continue;

    const group = groups.get(key) ?? {
      country,
      countryCode,
      trips: new Set<string>(),
    };
    group.country ??= country;
    group.countryCode ??= countryCode;
    group.trips.add(place.tripId);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map(({ country, countryCode, trips }) => ({
      country,
      countryCode,
      tripCount: trips.size,
    }))
    .sort((a, b) =>
      (a.country ?? a.countryCode ?? '').localeCompare(
        b.country ?? b.countryCode ?? '',
      ),
    );
}
