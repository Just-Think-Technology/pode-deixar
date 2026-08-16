import { IsDateString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AgendaQueryDto {
  @ApiProperty({
    description: "Data inicial do período (YYYY-MM-DD)",
    example: "2026-08-01",
  })
  @IsDateString({}, { message: "from deve ser uma data válida (YYYY-MM-DD)" })
  from: string;

  @ApiProperty({
    description:
      "Data final do período (YYYY-MM-DD). Janela máxima de 92 dias.",
    example: "2026-08-31",
  })
  @IsDateString({}, { message: "to deve ser uma data válida (YYYY-MM-DD)" })
  to: string;
}
