import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../domain/user.repository.js';
import { UserResponseDto } from './dto/user-response.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly repository: UserRepository) {}

  async exists(id: string): Promise<boolean> {
    return (await this.repository.findById(id)) !== null;
  }

  async getProfile(id: string): Promise<UserResponseDto> {
    const user = await this.repository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }

    return UserResponseDto.from(user);
  }
}
