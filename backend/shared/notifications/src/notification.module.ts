// Notifications module — shared NestJS wiring for the notification port

import { Global, Module } from "@nestjs/common";
import { PrismaModule } from "@pode-deixar/prisma";
import { NotificationsService } from "./notification.service";
import { PrismaNotificationAdapter } from "./notification.adapter";
import { UsersNotificationsAdapter } from "./users-notifications.adapter";
import { NOTIFICATION_PORT } from "./notification.interface";

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    NotificationsService,
    UsersNotificationsAdapter,
    PrismaNotificationAdapter,
    {
      provide: NOTIFICATION_PORT,
      useExisting: UsersNotificationsAdapter,
    },
  ],
  exports: [
    NotificationsService,
    UsersNotificationsAdapter,
    PrismaNotificationAdapter,
    NOTIFICATION_PORT,
  ],
})
export class NotificationsModule {}
