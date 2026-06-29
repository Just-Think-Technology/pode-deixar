import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';

export enum PublicRole {
  CLIENT = 'CLIENT',
  PROVIDER = 'PROVIDER',
}

export class RegisterDto {
  @ApiProperty({ description: 'Nome completo do usuário', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[\p{L}\s'-]+$/u, {
    message: 'nome completo contém caracteres inválidos',
  })
  complete_name: string;

  @ApiProperty({
    description: 'Endereço de email do usuário',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsString()
  email: string;

  @ApiProperty({
    description:
      'Senha do usuário (mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número, 1 especial)',
    example: 'Password123!',
    minLength: 8,
  })
  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message:
      'senha fraca: mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 especial',
  })
  password: string;

  @ApiProperty({
    description: 'Confirmação de senha (deve coincidir com o campo senha)',
    example: 'Password123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  confirm_password: string;

  @ApiProperty({
    description: 'Número de telefone do usuário',
    example: '+1234567890',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: 'CEP do usuário', example: '12345-678' })
  @IsString()
  @IsNotEmpty()
  postal_code: string;

  @ApiProperty({
    description: 'Função do usuário',
    enum: PublicRole,
    example: PublicRole.CLIENT,
  })
  @IsEnum(PublicRole, {
    message: 'função deve ser CLIENT (Cliente) ou PROVIDER (Prestador)',
  })
  role: PublicRole;
}
