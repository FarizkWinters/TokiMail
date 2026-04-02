export function extractOTP(text: string): string | null {
  if (!text) return null;

  const patterns = [
    /(?:kode|code|otp|pin|token|verification code|kode verifikasi|verifikasi)[^\d]*(\d{4,8})/i,
    /(\d{4,8})[^\d]*(?:is your|adalah|merupakan)[^\d]*(?:kode|code|otp|pin|token|verification)/i,
    /(?:^|[\s\-:])(\d{6})(?:[\s\-,.]|$)/m,
    /(?:^|[\s\-:])(\d{4})(?:[\s\-,.]|$)/m,
    /(?:^|[\s\-:])(\d{8})(?:[\s\-,.]|$)/m,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}
