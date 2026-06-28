import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Endereço de email do usuário',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsString()
  email: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'Password123!',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({
    description: 'Opção "lembrar-me" para sessão estendida',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
