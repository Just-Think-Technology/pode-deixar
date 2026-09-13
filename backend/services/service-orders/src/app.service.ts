// Service orders app service — root health endpoint

import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {

  // --- Public API ---

  getHello(): string {
    return "Pode Deixar - Service Orders Service";
  }
}
