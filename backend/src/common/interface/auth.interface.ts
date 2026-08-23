export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  userAgent?: string;
}

export interface loginDto {
  email: string;
  password: string;
  userAgent?: string;
}
