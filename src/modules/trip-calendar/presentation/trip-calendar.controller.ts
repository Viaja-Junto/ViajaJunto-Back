import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthenticatedUser } from '@shared/domain/authenticated-user.js';
import { ApiAuthenticated } from '@shared/http/decorators/api-auth-responses.decorator.js';
import {
  ApiIdParam,
  ApiNotFound,
} from '@shared/http/decorators/api-resource-responses.decorator.js';
import { IdParam } from '@shared/http/decorators/id-param.decorator.js';
import { CurrentUser } from '@modules/auth/presentation/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '@modules/auth/presentation/guards/jwt-auth.guard.js';
import { TripCalendarService } from '../application/trip-calendar.service.js';

@ApiTags('Trips')
@UseGuards(JwtAuthGuard)
@Controller('trips')
export class TripCalendarController {
  constructor(private readonly service: TripCalendarService) {}

  @ApiOperation({
    summary: 'Export the itinerary to a calendar',
    description:
      'An iCalendar (.ics) file with the trip dates, every stop (all-day) and every scheduled activity, ready to import into Google Calendar, Apple Calendar or Outlook. Events keep stable ids, so importing again updates them. Items without a date are left out. Any member of the trip can export it.',
  })
  @ApiIdParam('Trip identifier.')
  @ApiProduces('text/calendar')
  @ApiOkResponse({
    description: 'The calendar file.',
    schema: { type: 'string', example: 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\n…' },
  })
  @ApiNotFound(
    'No trip exists with this id, or the caller has no access to it.',
  )
  @ApiAuthenticated()
  @Get(':id/calendar.ics')
  async calendar(
    @IdParam() id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const file = await this.service.export(id, user);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );

    return file.content;
  }
}
