// Register service — signup with email verification

import { Injectable, BadRequestException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '@pode-deixar/prisma';
