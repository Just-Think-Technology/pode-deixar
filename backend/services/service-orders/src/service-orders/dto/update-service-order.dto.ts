// Service order update DTO — order change validation

import { PartialType } from "@nestjs/swagger";
import { CreateServiceOrderDto } from "./create-service-order.dto";

export class UpdateServiceOrderDto extends PartialType(CreateServiceOrderDto) {}
