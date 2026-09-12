// purpose — application hello service
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  // --- Public API ---
  getHello(): string {
    return 'Pode Deixar - Auth Service';
  }
}
