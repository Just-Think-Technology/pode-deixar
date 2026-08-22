import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { User } from '../auth/user.decorator';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT', 'PROVIDER', 'ADMIN')
  create(
    @Body() dto: CreateNotificationDto,
    @User('id') userId: string,
  ) {
    return this.notificationsService.create({ ...dto, recipient: dto.recipient || userId });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT', 'PROVIDER', 'ADMIN')
  findAll(
    @User('id') userId: string,
    @Query('lido') lido?: boolean,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.notificationsService.findByRecipient(userId, lido, page, limit);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT', 'PROVIDER', 'ADMIN')
  markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @User('id') userId: string,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }
}