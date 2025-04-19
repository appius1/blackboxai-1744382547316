import { authenticator } from 'otplib';
import QRCode from 'qrcode';

interface TwoFactorSecret {
  base32: string;
  qr: string;
}

/**
 * Generate a new TOTP secret and QR code
 * @returns Promise<TwoFactorSecret> The secret and QR code
 */
export const generateTwoFactorSecret = async (): Promise<TwoFactorSecret> => {
  // Generate secret
  const secret = authenticator.generateSecret();
  
  // Generate QR code
  const otpauth = authenticator.keyuri(
    'user', // This will be replaced with actual user email in the auth flow
    'Appius',
    secret
  );
  
  const qr = await QRCode.toDataURL(otpauth);

  return {
    base32: secret,
    qr,
  };
};

/**
 * Verify a TOTP token
 * @param secret The TOTP secret
 * @param token The token to verify
 * @returns boolean Whether the token is valid
 */
export const verifyTwoFactorToken = (secret: string, token: string): boolean => {
  try {
    return authenticator.verify({
      token,
      secret,
    });
  } catch (error) {
    return false;
  }
};

/**
 * Generate a TOTP token (useful for testing)
 * @param secret The TOTP secret
 * @returns string The generated token
 */
export const generateTwoFactorToken = (secret: string): string => {
  return authenticator.generate(secret);
};
