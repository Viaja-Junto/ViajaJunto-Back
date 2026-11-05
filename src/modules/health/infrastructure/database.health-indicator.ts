import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { PrismaService } from '@shared/database/prisma.service.js';

@Injectable()
export class DatabaseHealthIndicator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly indicators: HealthIndicatorService,
  ) {}

  async check(key: string) {
    const indicator = this.indicators.check(key);

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return indicator.up();
    } catch {
      // The reason stays in the logs, out of a public response.
      return indicator.down({ message: 'The database did not answer' });
    }
  }
}
