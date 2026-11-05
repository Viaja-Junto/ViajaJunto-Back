import { ApiProperty } from '@nestjs/swagger';
import type { AccessToken } from '../../domain/access-token.issuer.js';

export class AccessTokenResponseDto {
  @ApiProperty({
    description: 'JWT to send as `Authorization: Bearer <token>`.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({ description: 'Always "Bearer".', example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ description: 'Lifetime, in seconds.', example: 3600 })
  expiresIn!: number;

  static from(token: AccessToken): AccessTokenResponseDto {
    return {
      accessToken: token.value,
      tokenType: 'Bearer',
      expiresIn: token.expiresIn,
    };
  }
}
