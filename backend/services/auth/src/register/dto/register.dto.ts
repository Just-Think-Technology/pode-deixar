// Register DTO — signup input validation

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
  @ApiProperty({ description: 'User full name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[\p{L}\s'-]+$/u, {
    message: 'nome completo contém caracteres inválidos',
  })
  complete_name: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsString()
  email: string;

  @ApiProperty({
    description:
      'User password (minimum 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special)',
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
    description: 'Password confirmation (must match the password field)',
    example: 'Password123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  confirm_password: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: 'User postal code', example: '12345-678' })
  @IsString()
  @IsNotEmpty()
  postal_code: string;

  @ApiProperty({
    description: 'User role',
    enum: PublicRole,
    example: PublicRole.CLIENT,
  })
  @IsEnum(PublicRole, {
    message: 'função deve ser CLIENT (Cliente) ou PROVIDER (Prestador)',
  })
  role: PublicRole;
}
