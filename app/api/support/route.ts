import { NextRequest } from 'next/server';
import { checkBotId } from 'botid/server';
import logger from '@/lib/logger';

const SUPPORT_EMAIL = 'help@siosi.me';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, email, userId } = body;

    // Validate inputs
    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!userId && (!email || typeof email !== 'string')) {
      return Response.json({ error: 'Email is required for non-authenticated users' }, { status: 400 });
    }

    // Verify request against Vercel BotID
    const verification = await checkBotId();
    if (verification.isBot && !verification.isVerifiedBot) {
      logger.warn('BotID blocked support request', {
        user: userId || email,
        isHuman: verification.isHuman,
        isVerifiedBot: verification.isVerifiedBot,
      });
      return Response.json({ error: 'Security check failed. Please try again.' }, { status: 403 });
    }

    // Construct email content
    const emailSubject = 'New Support Request';
    const emailBody = `
New support request received:

${userId ? `User ID: ${userId}` : `Email: ${email}`}

Message:
${message}

-- 
Sent from síOsí Support Form
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