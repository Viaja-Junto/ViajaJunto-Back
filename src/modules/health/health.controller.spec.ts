import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let healthController: HealthController;
  const prisma = { $queryRaw: jest.fn() };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    healthController = app.get<HealthController>(HealthController);
  });

  it('should return ok with the database info', async () => {
    const db = { now: new Date(), version: 'PostgreSQL 16' };
    prisma.$queryRaw.mockResolvedValue([db]);

    await expect(healthController.check()).resolves.toMatchObject({
      status: 'ok',
      db,
    });
  });

  it('should return 503 when the database is unreachable', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

    await expect(healthController.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
