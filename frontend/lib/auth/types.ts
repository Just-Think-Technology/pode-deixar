export type PublicRole = "CLIENT" | "PROVIDER";

export type AuthUser = {
  id: string;
  complete_name: string;
  email: string;
  role: PublicRole;
};

export type LoginPayload = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type forgotPasswordResponse = {
  message: string;
};

export type ResetPasswordPayload = {
  token: string;
  newPassword: string;
};

export type ResetPasswordResponse = {
  message: string;
  user: {
    email: string;
    role: PublicRole;
  };
};

export type LoginResponse = {
  message: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: AuthUser;
};

export type RegisterPayload = {
  complete_name: string;
  email: string;
  password: string;
  confirm_password: string;
  phone: string;
  postal_code: string;
  role: PublicRole;
};

export type RegisterResponse = {
  message: string;
  user: {
    id: string;
    complete_name: string;
    email: string;
    role: PublicRole;
    phone: string;
    postal_code: string;
    email_verified: boolean;
    created_at: string;
  };
  email_verification_token?: string;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: AuthUser;
};

export type VerifyEmailPayload = {
  token: string;
};

export type VerifyEmailResponse = {
  message: string;
};

export type ResendVerificationPayload = {
  email: string;
};

export type ResendVerificationResponse = {
  message: string;
  email_verification_token?: string;
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> };

export type UserProfile = AuthUser & {
  phone: string;
  postal_code: string;
  email_verified: boolean;
  created_at: string;
  last_login_at: string | null;
};

export type ProfileResponse = { user: UserProfile };

export type UpdateWorkerProfilePayload = {
  complete_name: string;
  email: string;
  phone: string;
  postal_code: string;
  biography?: string;
};

export type UpdateProfileResponse = {
  message: string;
  user?: UserProfile;
};

export type RequestEmailChangePayload = {
  email: string;
};

export type RequestEmailChangeResponse = {
  message: string;
};

export type UpdateWorkerProfileResult = {
  message: string;
  emailChanged: boolean;
  user: UserProfile;
};
