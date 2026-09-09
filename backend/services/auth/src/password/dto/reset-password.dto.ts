import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token sent to the user email',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description:
      'New password (minimum 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special)',
    example: 'NewPassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message:
      'Senha deve ter no mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 especial',
  })
  newPassword: string;
}
