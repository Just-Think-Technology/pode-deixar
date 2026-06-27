import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendVerificationDto {
  @ApiProperty({
    example: 'user@email.com',
    description: 'Endereço de email para reenviar link de verificação',
  })
  @IsEmail()
  @IsString()
  email: string;
}