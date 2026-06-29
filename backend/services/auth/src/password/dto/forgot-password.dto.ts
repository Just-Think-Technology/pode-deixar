import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Endereço de email do usuário para redefinição de senha',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsString()
  email: string;
}
