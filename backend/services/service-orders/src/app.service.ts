import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getHello(): string {
    return "Pode Deixar - Service Orders Service";
  }
}
