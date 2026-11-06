import { Module } from '@nestjs/common';
import { UsersModule } from '@modules/users/users.module.js';
import { ModerationService } from './application/moderation.service.js';

@Module({
  imports: [UsersModule],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
