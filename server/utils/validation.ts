export const validatePassword = (password: string | null | undefined): boolean =>
  Boolean(password && password.length >= 8);
