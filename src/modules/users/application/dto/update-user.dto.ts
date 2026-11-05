import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { normalizeEmail } from '@modules/auth/application/dto/register.dto.js';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Display name shown next to the reviews and to trip members.',
    example: 'Ana Souza',
    minLength: 2,
    maxLength: 80,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
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
  @normalizeEmail()
  @IsEmail()
  @MaxLength(254)
  email?: string;
}
