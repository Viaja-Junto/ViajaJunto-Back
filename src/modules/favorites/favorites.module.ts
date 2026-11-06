import { Module } from '@nestjs/common';
import { AuthModule } from '@modules/auth/auth.module.js';
import { DestinationsModule } from '@modules/destinations/destinations.module.js';
import { TouristSpotsModule } from '@modules/tourist-spots/tourist-spots.module.js';
import { FavoritesService } from './application/favorites.service.js';
import { FavoriteRepository } from './domain/favorite.repository.js';
import { FavoritePrismaRepository } from './infrastructure/favorite.prisma.repository.js';
import { FavoritesController } from './presentation/favorites.controller.js';

@Module({
  imports: [AuthModule, DestinationsModule, TouristSpotsModule],
  controllers: [FavoritesController],
  providers: [
    FavoritesService,
    { provide: FavoriteRepository, useClass: FavoritePrismaRepository },
  ],
})
export class FavoritesModule {}
