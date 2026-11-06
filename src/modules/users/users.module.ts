import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UsersService } from './application/users.service.js';
import { UserRepository } from './domain/user.repository.js';
import { UserPrismaRepository } from './infrastructure/user.prisma.repository.js';
import { UsersController } from './presentation/users.controller.js';

@Module({
  // AuthModule imports this module, so JwtAuthGuard only gets PassportModule here.
  imports: [PassportModule.register({ session: false })],
  controllers: [UsersController],
  providers: [
    UsersService,
    { provide: UserRepository, useClass: UserPrismaRepository },
  ],
  exports: [UsersService, UserRepository],
})
export class UsersModule {}
