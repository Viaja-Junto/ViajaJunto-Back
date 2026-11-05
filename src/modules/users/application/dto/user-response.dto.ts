import { ApiProperty } from '@nestjs/swagger';
import {
  USER_ROLES,
  type User,
  type UserRole,
} from '../../domain/user.entity.js';

/** Built field by field so a new column never leaks into the API by accident. */
export class UserResponseDto {
  @ApiProperty({
    description: 'Unique identifier.',
    format: 'uuid',
    example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  id!: string;

  @ApiProperty({ description: 'Display name.', example: 'Ana Souza' })
  name!: string;

  @ApiProperty({
    description: 'Sign-in address.',
    format: 'email',
    example: 'ana@example.com',
  })
  email!: string;

  @ApiProperty({
    description:
      'USER, or ADMIN for the accounts that moderate the catalogs. Never set through the API.',
    enum: USER_ROLES,
    example: 'USER',
  })
  role!: UserRole;

  @ApiProperty({
    description: 'When the account was created.',
    type: String,
    format: 'date-time',
    example: '2026-03-14T18:22:05.000Z',
  })
  createdAt!: Date;

  static from(entity: User): UserResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      role: entity.role,
      createdAt: entity.createdAt,
    };
  }
}
