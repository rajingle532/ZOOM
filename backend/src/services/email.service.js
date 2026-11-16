import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "PulseMeet <onboarding@resend.dev>";

let resendClient = null;
if (RESEND_API_KEY) {
    try {
        resendClient = new Resend(RESEND_API_KEY);
    } catch (err) {
        console.error("Failed to initialize Resend client:", err.message);
    }
}

/**
 * Sends a transactional email using Resend or falls back to a simulated console notice.
 * Never logs raw sensitive tokens or passwords.
 */
export async function sendEmail({ to, subject, html, text }) {
    if (resendClient) {
        try {
            const data = await resendClient.emails.send({
                from: EMAIL_FROM,
                to,
                subject,
                html,
                text
            });
            return { success: true, id: data.id };
        } catch (err) {
            console.error(`[Resend Error] Failed to send email to ${to}:`, err.message);
            // Fall back to console simulation
        }
    }

    // Fallback: Console email simulation in development / test environments
    // Strictly follows Rule 3: Never log raw tokens or plain passwords.
    console.log(`[Email Service Simulation] Sent email to: ${to} | Subject: ${subject}`);
    return { success: true, simulated: true };
}

export async function sendVerificationOtpEmail(to, name, otpCode) {
    const subject = "Verify your PulseMeet account";
    const text = `Hello ${name},\n\nYour 6-digit verification code is: ${otpCode}\n\nThis code will expire in 15 minutes.\n\nBest regards,\nThe PulseMeet Team`;
    const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background: #0A0A0B; color: #EDEDEF; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);">
            <h2 style="color: #34D399; margin-top: 0;">PulseMeet Verification</h2>
            <p>Hello ${name},</p>
            <p>Enter the 6-digit code below to verify your email address:</p>
            <div style="background: #16161A; border: 1px solid rgba(52, 211, 153, 0.3); border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #34D399; font-family: monospace;">${otpCode}</span>
            </div>
            <p style="color: #A1A1AA; font-size: 13px;">This verification code will expire in 15 minutes. If you did not request this, you can safely ignore this email.</p>
        </div>
    `;
    return sendEmail({ to, subject, text, html });
}

export async function sendPasswordResetEmail(to, name, resetUrl) {
    const subject = "Reset your PulseMeet password";
    const text = `Hello ${name},\n\nWe received a request to reset your PulseMeet password. Click the link below to set a new password:\n\n${resetUrl}\n\nThis link will expire in 15 minutes.\n\nIf you did not request a password reset, please ignore this email.\n\nBest regards,\nThe PulseMeet Team`;
    const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background: #0A0A0B; color: #EDEDEF; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);">
            <h2 style="color: #34D399; margin-top: 0;">Password Reset Request</h2>
            <p>Hello ${name},</p>
            <p>We received a request to reset your password. Click the button below to choose a new password:</p>
            <div style="text-align: center; margin: 28px 0;">
                <a href="${resetUrl}" style="background: #34D399; color: #0A0A0B; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #A1A1AA; font-size: 13px;">This link will expire in 15 minutes. If you did not request this, no changes have been made to your account.</p>
            <p style="color: #71717A; font-size: 11px; word-break: break-all;">Link URL: ${resetUrl}</p>
        </div>
    `;
    return sendEmail({ to, subject, text, html });
}
