import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendVerificationDto {
  @ApiProperty({
    example: 'user@email.com',
    description: 'Email address to resend the verification link to',
  })
  @IsEmail()
  @IsString()
  email: string;
}
