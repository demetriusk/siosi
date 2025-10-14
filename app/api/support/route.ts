import { NextRequest } from 'next/server';
import logger from '@/lib/logger';

const SUPPORT_EMAIL = 'help@siosi.me';

type TurnstileVerification = {
  success: boolean;
  errors?: string[];
};

// Verify Cloudflare Turnstile token
async function verifyTurnstile(token: string, remoteIp?: string): Promise<TurnstileVerification> {
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  
  if (!secretKey) {
    logger.warn('CLOUDFLARE_TURNSTILE_SECRET_KEY not set - skipping verification');
    return { success: true }; // Allow in dev mode
  }

  try {
    const params = new URLSearchParams();
    params.append('secret', secretKey);
    params.append('response', token);
    if (remoteIp) {
      params.append('remoteip', remoteIp);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();
    if (!data.success) {
      logger.warn('Turnstile verification failed', {
        errors: data['error-codes'],
        remoteIp,
      });
      console.warn('Turnstile verification failed', {
        errors: data['error-codes'],
        remoteIp,
      });
    }
    return {
      success: data.success === true,
      errors: Array.isArray(data['error-codes']) ? data['error-codes'] : undefined,
    };
  } catch (error) {
    logger.error('Turnstile verification error:', error);
    console.error('Turnstile verification error:', error);
    return {
      success: false,
      errors: ['turnstile_verification_exception'],
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      email,
      userId,
      turnstileToken,
      captchaToken,
    } = body;
    const turnstileSecretConfigured = Boolean(process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY);
    const remoteIp =
      req.headers.get('cf-connecting-ip') ??
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      undefined;
    const providedToken =
      typeof turnstileToken === 'string' && turnstileToken.trim().length > 0
        ? turnstileToken
        : typeof captchaToken === 'string' && captchaToken.trim().length > 0
          ? captchaToken
          : null;

    // Validate inputs
    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!userId && (!email || typeof email !== 'string')) {
      return Response.json({ error: 'Email is required for non-authenticated users' }, { status: 400 });
    }

    // Verify Turnstile token
    if (turnstileSecretConfigured) {
      if (!providedToken) {
        return Response.json({ error: 'Security check required' }, { status: 400 });
      }

      const verification = await verifyTurnstile(providedToken, remoteIp);
      if (!verification.success) {
        logger.warn('Invalid Turnstile token', {
          user: userId || email,
          remoteIp,
          errors: verification.errors,
        });
        console.warn('Invalid Turnstile token', {
          user: userId || email,
          remoteIp,
          errors: verification.errors,
        });
        return Response.json(
          {
            error: 'Security check failed. Please try again.',
            turnstileErrors: verification.errors ?? null,
          },
          { status: 400 },
        );
      }
    } else if (turnstileToken) {
      logger.info('Received Turnstile token while verification disabled');
    }

    // Construct email content
    const emailSubject = 'New Support Request';
    const emailBody = `
New support request received:

${userId ? `User ID: ${userId}` : `Email: ${email}`}

Message:
${message}

---
Sent from siOsi Support Form
    `.trim();

    // Try to send via Resend (FREE 3000/month)
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (resendApiKey) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'support@siosi.me', // Must be verified domain in Resend
            to: SUPPORT_EMAIL,
            subject: emailSubject,
            text: emailBody,
            reply_to: userId ? undefined : email,
          }),
        });

        if (!resendRes.ok) {
          const resendError = await resendRes.text();
          logger.error('Resend API error:', resendError);
          throw new Error('Failed to send via Resend');
        }

        const resendData = await resendRes.json();
        logger.info('Support email sent via Resend:', resendData.id);
        return Response.json({ success: true, method: 'resend', id: resendData.id });
      } catch (resendErr) {
        logger.error('Resend failed:', resendErr);
        // Fall through to logging
      }
    }

    // Fallback: log to console (dev mode)
    logger.info('=== SUPPORT EMAIL (logged, not sent) ===');
    logger.info('To:', SUPPORT_EMAIL);
    logger.info('Subject:', emailSubject);
    logger.info('Body:\n', emailBody);
    logger.info('========================================');

    return Response.json({ 
      success: true, 
      method: 'logged',
      note: 'Email logged. Add RESEND_API_KEY to send real emails.'
    });

  } catch (err: any) {
    logger.error('Support API error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}