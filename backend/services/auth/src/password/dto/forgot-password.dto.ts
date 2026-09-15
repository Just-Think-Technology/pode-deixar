// Forgot password DTO — reset request input validation

import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'User email address for password reset',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsString()
  email: string;
}
