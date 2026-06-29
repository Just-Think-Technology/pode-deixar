import { PartialType, OmitType } from "@nestjs/swagger";
import { CreateProposalDto } from "./create-proposal.dto";

export class UpdateProposalDto extends PartialType(
  OmitType(CreateProposalDto, ["serviceOrderId"] as const),
) {}
