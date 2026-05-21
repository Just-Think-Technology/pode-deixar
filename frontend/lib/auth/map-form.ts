import type { LoginPayload, PublicRole, RegisterPayload } from "@/lib/auth/types";

export function parseLoginForm(form: HTMLFormElement): LoginPayload {
  const fd = new FormData(form);
  const rememberMe =
    fd.get("rememberMe") === "true" ||
    fd.get("rememberMe") === "on" ||
    fd.get("rememberMe") === "1";

  return {
    email: String(fd.get("email") ?? "").trim(),
    password: String(fd.get("password") ?? ""),
    ...(rememberMe && { rememberMe: true }),
  };
}

export function parseRegisterForm(
  form: HTMLFormElement,
  role: PublicRole,
): RegisterPayload {
  const fd = new FormData(form);

  return {
    complete_name: String(fd.get("complete_name") ?? "").trim(),
    email: String(fd.get("email") ?? "").trim(),
    password: String(fd.get("password") ?? ""),
    confirm_password: String(fd.get("confirm-password") ?? ""),
    phone: String(fd.get("phone") ?? "").trim(),
    postal_code: String(fd.get("postal_code") ?? "").trim(),
    role,
  };
}
