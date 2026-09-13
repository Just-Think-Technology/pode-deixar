// Auth hello service — root status message

import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {

  // --- Public API ---

  getHello(): string {
    return 'Pode Deixar - Auth Service';
  }
}
