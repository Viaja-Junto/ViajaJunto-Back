import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateTouristSpotDto } from './create-tourist-spot.dto.js';
import { ListTouristSpotsQueryDto } from './list-tourist-spots-query.dto.js';
import { UpdateTouristSpotDto } from './update-tourist-spot.dto.js';

const errorsOf = async <T extends object>(
  type: new () => T,
  body: Record<string, unknown>,
) =>
  (await validate(plainToInstance(type, body))).map(({ property }) => property);

const spot = {
  name: 'Usina do Gasômetro',
  city: 'Porto Alegre',
  country: 'Brasil',
};

describe('CreateTouristSpotDto', () => {
  it('accepts the minimum payload', async () => {
    expect(await errorsOf(CreateTouristSpotDto, spot)).toEqual([]);
  });

  it('accepts a complete payload', async () => {
    expect(
      await errorsOf(CreateTouristSpotDto, {
        ...spot,
        description: 'Centro cultural',
        category: 'HISTORICAL',
        address: 'Av. Presidente João Goulart, 551',
        state: 'RS',
        countryCode: 'br',
        latitude: -30.034647,
        longitude: -51.241455,
        photoUrl: 'https://example.com/usina.jpg',
      }),
    ).toEqual([]);
  });

  it('upper-cases the country code and trims the names', () => {
    const dto = plainToInstance(CreateTouristSpotDto, {
      ...spot,
      name: '  Usina  ',
      countryCode: ' br ',
    });

    expect(dto.name).toBe('Usina');
    expect(dto.countryCode).toBe('BR');
  });

  it.each([
    ['a blank name', { name: '   ' }, 'name'],
    ['a missing city', { city: undefined }, 'city'],
    ['a missing country', { country: undefined }, 'country'],
    ['an unknown category', { category: 'CASINO' }, 'category'],
    ['an invalid country code', { countryCode: 'XX' }, 'countryCode'],
    ['a latitude beyond 90', { latitude: 91 }, 'latitude'],
    ['a longitude beyond 180', { longitude: -181 }, 'longitude'],
    ['too many decimals', { latitude: 1.1234567 }, 'latitude'],
    ['a photo that is not a URL', { photoUrl: 'usina.jpg' }, 'photoUrl'],
  ])('rejects %s', async (_name, overrides, property) => {
    expect(
      await errorsOf(CreateTouristSpotDto, { ...spot, ...overrides }),
    ).toEqual([property]);
  });
});

describe('UpdateTouristSpotDto', () => {
  it('accepts an empty change', async () => {
    expect(await errorsOf(UpdateTouristSpotDto, {})).toEqual([]);
  });

  it('keeps the rules of the fields it changes', async () => {
    expect(await errorsOf(UpdateTouristSpotDto, { latitude: 100 })).toEqual([
      'latitude',
    ]);
  });
});

describe('ListTouristSpotsQueryDto', () => {
  it('defaults to the newest first', () => {
    expect(plainToInstance(ListTouristSpotsQueryDto, {}).sort).toBe('newest');
  });

  it('reads minRating from the query string as a number', () => {
    expect(
      plainToInstance(ListTouristSpotsQueryDto, { minRating: '4.5' }).minRating,
    ).toBe(4.5);
  });

  it.each([
    ['an unknown sort', { sort: 'random' }, 'sort'],
    ['a rating above 5', { minRating: '6' }, 'minRating'],
    ['an unknown category', { category: 'CASINO' }, 'category'],
  ])('rejects %s', async (_name, query, property) => {
    expect(await errorsOf(ListTouristSpotsQueryDto, query)).toEqual([property]);
  });
});
