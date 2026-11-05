import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { hostname } from 'os';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      const [db] = await this.prisma.$queryRaw<
        { now: Date; version: string }[]
      >`SELECT now() AS now, version() AS version`;
      return { status: 'ok', pod: hostname(), db };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        pod: hostname(),
        db: 'unreachable',
      });
    }
  }
}
