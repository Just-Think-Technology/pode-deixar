// Prisma service — Nest lifecycle for the database client

import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { buildPrismaTracingExtension } from "@pode-deixar/tracing";

/** Extension shape accepted by `$extends`, read from the client itself. */
type PrismaExtensionArgument = Parameters<PrismaClient["$extends"]>[0];

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super();
    // `$extends` returns a new client instead of mutating this one, so the
    // traced client is returned from the constructor: that makes it the
    // instance Nest injects, keeping every call site (this.prisma.serviceOrder,
    // this.prisma.$transaction) instrumented from a single place.
    return this.$extends(
      buildPrismaTracingExtension() as unknown as PrismaExtensionArgument,
    ) as unknown as PrismaService;
  }

  // --- Public API ---

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
