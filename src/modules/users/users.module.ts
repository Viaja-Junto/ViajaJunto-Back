import { Module } from '@nestjs/common';
import { UsersService } from './application/users.service.js';
import { UserRepository } from './domain/user.repository.js';
import { UserPrismaRepository } from './infrastructure/user.prisma.repository.js';

@Module({
  providers: [
    UsersService,
    { provide: UserRepository, useClass: UserPrismaRepository },
  ],
  exports: [UsersService, UserRepository],
})
export class UsersModule {}
