import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

/**
 * Create and configure Nodemailer transporter
 */
const createTransporter = () => {
  const { service, host, port, secure, user, pass } = config.smtp;

  // If user and pass are missing, return null to use development console mode
  if (!user || !pass) {
    return null;
  }

  // Pre-configured service (e.g. 'gmail')
  if (service && service.toLowerCase() === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }

  // Custom SMTP (Resend, SendGrid, Mailgun, Amazon SES, or custom host)
  return nodemailer.createTransport({
    host,
    port,
    secure, // true for 465, false for other ports
    auth: { user, pass },
  });
};

/**
 * Generic email sender
 * @param {Object} options - { to, subject, text, html }
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  const transporter = createTransporter();

  // If no SMTP credentials configured, fallback gracefully in development
  if (!transporter) {
    console.log('\n' + '='.repeat(70));
    console.log('[StyleSync Email Service] ✉️ Simulated Email (No SMTP configured)');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('Body Text:');
    console.log(text);
    console.log('To send real emails to your inbox, set SMTP_USER and SMTP_PASS in .env');
    console.log('='.repeat(70) + '\n');

    return {
      success: true,
      simulated: true,
      message: 'Simulated email logged to server console (SMTP not configured).',
    };
  }

  const mailOptions = {
    from: config.smtp.from,
    to,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[StyleSync Email Service] 📨 Email sent successfully to ${to}. MessageId: ${info.messageId}`);
  return {
    success: true,
    messageId: info.messageId,
  };
};

/**
 * Dispatches a password reset email
 * @param {Object} params - { to, name, resetUrl }
 */
export const sendPasswordResetEmail = async ({ to, name = 'there', resetUrl }) => {
  const subject = 'Reset Your StyleSync Password';

  const text = `Hello ${name},

You requested a password reset for your StyleSync account.

Please visit the link below to set a new password:
${resetUrl}

This link is valid for 15 minutes. If you did not request this password reset, please ignore this email.

Best regards,
The StyleSync Team`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background-color: #0f172a;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td style="background-color: #10b981; border-radius: 10px; width: 36px; height: 36px; text-align: center; vertical-align: middle;">
                    <span style="color: #ffffff; font-size: 20px; font-weight: bold; line-height: 36px;">🛍️</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">StyleSync</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 36px 32px 28px;">
              <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #0f172a; text-align: center;">Reset Your Password</h1>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #475569;">
                Hello <strong>${name}</strong>,
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569;">
                We received a request to reset your password for your StyleSync account. Click the button below to choose a new password:
              </p>

              <!-- Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 12px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color: #f1f5f9; border-radius: 12px; padding: 16px; margin: 24px 0 16px;">
                <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #475569;">
                  ⏱️ Security Notice:
                </p>
                <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                  This recovery link will expire in <strong>15 minutes</strong>. If you did not make this request, you can safely ignore this email—your account remains completely secure.
                </p>
              </div>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

              <p style="margin: 0 0 8px; font-size: 11px; color: #94a3b8;">
                If the button doesn't work, copy and paste this URL into your browser:
              </p>
              <p style="margin: 0; font-size: 11px; word-break: break-all;">
                <a href="${resetUrl}" style="color: #059669; text-decoration: underline;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px 28px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                © ${new Date().getFullYear()} StyleSync AI Personal Shopping Advisor. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return await sendEmail({ to, subject, text, html });
};
