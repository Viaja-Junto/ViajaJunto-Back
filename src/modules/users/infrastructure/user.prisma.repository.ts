import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import type { User, UserCredentials } from '../domain/user.entity.js';
import { CreateUserData, UserRepository } from '../domain/user.repository.js';

const PUBLIC_FIELDS = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
} as const;

@Injectable()
export class UserPrismaRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_FIELDS,
    });
  }

  findCredentialsByEmail(email: string): Promise<UserCredentials | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { ...PUBLIC_FIELDS, passwordHash: true },
    });
  }

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data, select: PUBLIC_FIELDS });
  }
}
