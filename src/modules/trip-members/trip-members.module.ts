import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TripAccessModule } from '../trip-access/trip-access.module.js';
import { TripMembersService } from './application/trip-members.service.js';
import { TripMemberRepository } from './domain/trip-member.repository.js';
import { TripMemberPrismaRepository } from './infrastructure/trip-member.prisma.repository.js';
import { TripMembersController } from './presentation/trip-members.controller.js';

@Module({
  imports: [AuthModule, TripAccessModule],
  controllers: [TripMembersController],
  providers: [
    TripMembersService,
    { provide: TripMemberRepository, useClass: TripMemberPrismaRepository },
  ],
  exports: [TripMembersService],
})
export class TripMembersModule {}
