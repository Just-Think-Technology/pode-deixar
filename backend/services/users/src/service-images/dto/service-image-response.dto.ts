import { ApiProperty } from "@nestjs/swagger";

export class ServiceImageResponseDto {
  @ApiProperty({ description: "ID da imagem" })
  id: string;

  @ApiProperty({ description: "URL pública da imagem" })
  url: string;

  @ApiProperty({ description: "Data de upload" })
  created_at: string;
}
