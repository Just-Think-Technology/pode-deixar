import { ApiProperty } from "@nestjs/swagger";

export class ServiceImageResponseDto {
  @ApiProperty({ description: "Image ID" })
  id: string;

  @ApiProperty({ description: "Public image URL" })
  url: string;

  @ApiProperty({ description: "Upload date" })
  created_at: string;
}
