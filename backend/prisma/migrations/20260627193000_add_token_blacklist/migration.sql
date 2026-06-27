-- CreateTable: token_blacklist
CREATE TABLE "token_blacklist" (
    "jti" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_blacklist_pkey" PRIMARY KEY ("jti")
);

-- CreateIndex: expires_at for cleanup
CREATE INDEX "token_blacklist_expires_at_idx" ON "token_blacklist"("expires_at");
