import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { env } from '../../shared/config/env.js';
import { UsersModule } from '../users/users.module.js';
import { AuthService } from './application/auth.service.js';
import { AccessTokenIssuer } from './domain/access-token.issuer.js';
import { PasswordHasher } from './domain/password-hasher.js';
import { JwtAccessTokenIssuer } from './infrastructure/jwt-access-token.issuer.js';
import { JwtStrategy } from './infrastructure/jwt.strategy.js';
import { ScryptPasswordHasher } from './infrastructure/scrypt-password.hasher.js';
import { AuthController } from './presentation/auth.controller.js';

@Module({
  imports: [
    UsersModule,
    // Stateless API: the JWT is the session.
    PassportModule.register({ session: false }),
    JwtModule.register({
      secret: env.JWT_SECRET,
      signOptions: { algorithm: 'HS256', expiresIn: env.JWT_EXPIRES_IN },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: AccessTokenIssuer, useClass: JwtAccessTokenIssuer },
    { provide: PasswordHasher, useClass: ScryptPasswordHasher },
  ],
  // Re-exported so a feature module can use JwtAuthGuard by importing AuthModule.
  exports: [PassportModule],
})
export class AuthModule {}
