import { NextRequest } from 'next/server';
import logger from '@/lib/logger';

const SUPPORT_EMAIL = 'help@siosi.me';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, locale, userId, happiness, message } = body;

    // Compose a friendly email body
      // Build link to analysis
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
      const analysisUrl = `https://www.siosi.me/${locale}/look/${sessionId}`;

      // Compose email content
      const emailSubject = 'Analysis feedback';
      const emailBody = `
  Analysis feedback received:

  Session ID: ${sessionId}
  Locale: ${locale}
  User ID: ${userId}
  Happiness: ${happiness}
  Message: ${message || '(none)'}

  View analysis: ${analysisUrl}
  -- 
  Sent from síOsí Analysis Feedback
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
              from: 'support@siosi.me',
              to: SUPPORT_EMAIL,
              subject: emailSubject,
              text: emailBody,
            }),
          });

          if (!resendRes.ok) {
            const resendError = await resendRes.text();
            logger.error('Resend API error:', resendError);
            throw new Error('Failed to send via Resend');
          }

          const resendData = await resendRes.json();
          logger.info('Feedback email sent via Resend:', resendData.id);
          return Response.json({ success: true, method: 'resend', id: resendData.id });
        } catch (resendErr) {
          logger.error('Resend failed:', resendErr);
          // Fall through to logging
        }
      }

      // Fallback: log to console (dev mode)
      logger.info('=== FEEDBACK EMAIL (logged, not sent) ===');
      logger.info('To:', SUPPORT_EMAIL);
      logger.info('Subject:', emailSubject);
      logger.info('Body:\n', emailBody);
      logger.info('========================================');

      return Response.json({ 
        success: true, 
        method: 'logged',
        note: 'Email logged. Add RESEND_API_KEY to send real emails.'
      });

  } catch (error) {
      logger.error('Feedback API error:', error);
      return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
