export function authErrorKey(message: string | undefined) {
  const error = message?.toLocaleLowerCase("en-US") ?? "";

  if (error.includes("invalid email or password") || error.includes("invalid credentials")) {
    return "errors.invalidCredentials";
  }
  if (error.includes("already exists") || error.includes("already registered")) {
    return "errors.accountExists";
  }
  if (error.includes("email") && (error.includes("invalid") || error.includes("valid"))) {
    return "errors.invalidEmail";
  }
  if (error.includes("password") && (error.includes("short") || error.includes("at least") || error.includes("minimum"))) {
    return "errors.shortPassword";
  }
  if (error.includes("not verified") || error.includes("not been verified")) {
    return "errors.emailUnverified";
  }
  if (error.includes("too many") || error.includes("rate limit")) {
    return "errors.tooManyAttempts";
  }
  if (error.includes("network") || error.includes("fetch") || error.includes("connection") || error.includes("load failed")) {
    return "errors.network";
  }

  return undefined;
}
