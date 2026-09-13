// Provider service update DTO — offered service change validation

import { PartialType } from "@nestjs/swagger";
import { CreateProviderServiceDto } from "./create-provider-service.dto";

export class UpdateProviderServiceDto extends PartialType(
  CreateProviderServiceDto,
) {}
