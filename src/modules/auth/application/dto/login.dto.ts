import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { normalizeEmail } from './register.dto.js';

export class LoginDto {
  @ApiProperty({
    description: 'Sign-in address.',
    format: 'email',
    example: 'ana@example.com',
  })
  @normalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    description: 'Account password.',
    format: 'password',
    example: 'viaja-junto-2026',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password!: string;
}
