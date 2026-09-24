// Notifications module — shared NestJS wiring for the notification port

import { Global, Module } from "@nestjs/common";
import { PrismaModule } from "@pode-deixar/prisma";
import { NotificationsService } from "./notification.service";
import { PrismaNotificationAdapter } from "./notification.adapter";
import { NOTIFICATION_PORT } from "./notification.interface";

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    NotificationsService,
    PrismaNotificationAdapter,
    {
      provide: NOTIFICATION_PORT,
      useExisting: PrismaNotificationAdapter,
    },
  ],
  exports: [NotificationsService, PrismaNotificationAdapter, NOTIFICATION_PORT],
})
export class NotificationsModule {}
