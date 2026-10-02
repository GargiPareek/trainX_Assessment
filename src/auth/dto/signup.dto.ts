import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'phone must be a valid international phone number' })
  phone!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  studentId!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password!: string;
}
