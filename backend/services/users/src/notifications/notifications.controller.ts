// Notifications controller — user notification endpoints

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard, RolesGuard, Roles } from "@pode-deixar/security";
import { AuthenticatedRequest } from "@pode-deixar/security";
import { NotificationsService } from "./notifications.service";
import { ListNotificationsDto } from "./dto/list-notifications.dto";

// --- Controller ---

@ApiTags("Notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // --- Public API ---

  @Get("unread-count")
  @Roles("CLIENT", "PROVIDER", "ADMIN")
  @ApiOperation({ summary: "Count unread notifications" })
  @ApiResponse({ status: 200, description: "Unread count" })
  async countUnread(@Request() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    const count = await this.notificationsService.countUnread(userId);
    return { count };
  }

  @Get()
  @Roles("CLIENT", "PROVIDER", "ADMIN")
  @ApiOperation({ summary: "List notifications for authenticated user" })
  @ApiResponse({ status: 200, description: "Notifications retrieved" })
  async list(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListNotificationsDto,
  ) {
    const userId = req.user.sub;
    return this.notificationsService.list(userId, query);
  }

  @Post("read-all")
  @Roles("CLIENT", "PROVIDER", "ADMIN")
  @ApiOperation({ summary: "Mark all notifications as read" })
  @ApiResponse({ status: 200, description: "All notifications marked as read" })
  async markAllRead(@Request() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.notificationsService.markAllRead(userId);
  }

  @Post(":id/read")
  @Roles("CLIENT", "PROVIDER", "ADMIN")
  @ApiOperation({ summary: "Mark notification as read" })
  @ApiResponse({ status: 200, description: "Notification marked as read" })
  @ApiResponse({ status: 404, description: "Notification not found" })
  async markRead(
    @Request() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const userId = req.user.sub;
    return this.notificationsService.markRead(userId, id);
  }
}
