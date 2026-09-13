// Common module — shared exception filter wiring

import { Module } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

@Module({

  // --- Providers ---

  providers: [GlobalExceptionFilter],
  exports: [GlobalExceptionFilter],
})
export class CommonModule {}
