/**
 * Environment Variables Configuration & Production Readiness Verification
 */

const validateEnv = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const issues = [];
  const warnings = [];

  // 1. Mandatory Port & MongoDB URI
  if (!process.env.PORT) {
    warnings.push('PORT is not set. Defaulting to 5000.');
  }

  if (!process.env.MONGODB_URI) {
    warnings.push('MONGODB_URI is not set. Defaulting to local MongoDB (mongodb://127.0.0.1:27018/echo_memory_db).');
  }

  // 2. JWT Secret Validation
  const jwtSecret = process.env.JWT_SECRET;
  const defaultSecret = 'echo_voice_memory_jwt_secret_key_2026_super_secure';

  if (!jwtSecret) {
    if (isProduction) {
      issues.push('CRITICAL: JWT_SECRET must be explicitly configured in production.');
    } else {
      warnings.push('JWT_SECRET is using default development fallback secret. Set a strong secret in .env.');
    }
  } else if (jwtSecret === defaultSecret && isProduction) {
    issues.push('CRITICAL: JWT_SECRET is set to the default placeholder. Change it for production security.');
  } else if (jwtSecret.length < 16) {
    warnings.push('JWT_SECRET is shorter than 16 characters. A 32+ character random secret is strongly recommended.');
  }

  // 3. AI Providers Status Check
  const hasWhisperKey = Boolean(process.env.OPENAI_API_KEY);
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

  if (!hasWhisperKey && !hasGeminiKey) {
    warnings.push('No external AI API keys detected (OPENAI_API_KEY / GEMINI_API_KEY). Operational fallback AI pipeline is active.');
  }

  // Print results
  if (warnings.length > 0) {
    console.log('[Config] Environment notices:');
    warnings.forEach((w) => console.warn(`  ⚠ ${w}`));
  }

  if (issues.length > 0) {
    console.error('[Config] Environment validation errors:');
    issues.forEach((err) => console.error(`  ✖ ${err}`));
    if (isProduction) {
      throw new Error(`Environment validation failed with ${issues.length} critical issues.`);
    }
  } else {
    console.log('[Config] Environment configuration validated successfully.');
  }

  return {
    isProduction,
    hasWhisperKey,
    hasGeminiKey,
  };
};

module.exports = { validateEnv };
