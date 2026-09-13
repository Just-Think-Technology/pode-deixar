// Payments root controller — service status endpoint

import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // --- Public API ---

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
