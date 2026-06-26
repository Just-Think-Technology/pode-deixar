import { PartialType } from "@nestjs/swagger";
import { CreateProviderServiceDto } from "./create-provider-service.dto";

export class UpdateProviderServiceDto extends PartialType(
  CreateProviderServiceDto,
) {}
