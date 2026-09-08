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
} from "@nestjs/common";
import { JwtAuthGuard, RolesGuard, Roles } from "@pode-deixar/security";
import { User } from "../auth/user.decorator";
import { NotificationsService } from "./notifications.service";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { ListNotificationsQueryDto } from "./dto/list-notifications-query.dto";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENT", "PROVIDER", "ADMIN")
  create(@Body() dto: CreateNotificationDto, @User("sub") userId: string) {
    // O recipient do corpo é ignorado: a notificação vai para o próprio autor.
    return this.notificationsService.create(userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENT", "PROVIDER", "ADMIN")
  findAll(
    @User("sub") userId: string,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.findByRecipient(
      userId,
      query.lido,
      query.page ?? 1,
      query.limit ?? 20,
    );
  }

  @Patch(":id/read")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CLIENT", "PROVIDER", "ADMIN")
  markAsRead(
    @Param("id", ParseUUIDPipe) id: string,
    @User("sub") userId: string,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }
}
