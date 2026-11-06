import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';
import { NormalizedEmail, Trimmed } from '@shared/http/dto/transforms.js';

export class RegisterDto {
  @ApiProperty({
    description: 'Display name shown next to the reviews.',
    example: 'Ana Souza',
    minLength: 2,
    maxLength: 80,
  })
  @Trimmed()
  @IsString()
  @Length(2, 80)
  name!: string;

  @ApiProperty({
    description: 'Sign-in address; compared case-insensitively.',
    format: 'email',
    example: 'ana@example.com',
    maxLength: 254,
  })
  @NormalizedEmail()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    description: 'Between 8 and 72 characters.',
    format: 'password',
    example: 'viaja-junto-2026',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @Length(8, 72)
  password!: string;
}
