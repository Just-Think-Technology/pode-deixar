-- CreateEnum
CREATE TYPE "CounterProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable: counter_proposals
CREATE TABLE "counter_proposals" (
    "id" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "estimated_duration" TEXT,
    "status" "CounterProposalStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "counter_proposals_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "counter_proposals" ADD CONSTRAINT "counter_proposals_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
