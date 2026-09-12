import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { Transform } from "class-transformer";
import { PageQueryDto } from "@pode-deixar/validation";

export class ListNotificationsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({
    description: "Filter by read state",
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : value === true || value === "true",
  )
  @IsBoolean({ message: "Filtro de leitura deve ser verdadeiro ou falso" })
  lido?: boolean;
}
