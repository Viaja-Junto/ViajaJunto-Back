import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JWT_STRATEGY } from '../../auth.constants.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard(JWT_STRATEGY) {}
