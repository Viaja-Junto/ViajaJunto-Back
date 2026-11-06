import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { NormalizedEmail, Trimmed } from '@shared/http/dto/transforms.js';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Display name shown next to the reviews and to trip members.',
    example: 'Ana Souza',
    minLength: 2,
    maxLength: 80,
  })
  @IsOptional()
  @Trimmed()
  @IsString()
  @Length(2, 80)
  name?: string;

  @ApiPropertyOptional({
    description: 'Sign-in address; compared case-insensitively.',
    format: 'email',
    example: 'ana@example.com',
    maxLength: 254,
  })
  @IsOptional()
  @NormalizedEmail()
  @IsEmail()
  @MaxLength(254)
  email?: string;
}
