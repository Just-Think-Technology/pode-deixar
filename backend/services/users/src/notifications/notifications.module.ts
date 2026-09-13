import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { NotificationsRepository } from "./notifications.repository";
import { NotificationsController } from "./notifications.controller";
import { PrismaModule } from "@pode-deixar/prisma";

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository],
  exports: [NotificationsService],
})
export class NotificationsModule {}
