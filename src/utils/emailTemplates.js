const baseTemplate = ({ previewText, headerText, bodyHtml, buttonUrl, buttonText, footerNote }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${headerText}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${previewText}</span>

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:22px;font-weight:700;color:#111827;letter-spacing:2px;text-transform:uppercase;">
                Fashion Store
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:12px;padding:48px 40px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">

              <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111827;">
                ${headerText}
              </h1>

              ${bodyHtml}

              ${buttonUrl ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
                <tr>
                  <td align="center">
                    <a href="${buttonUrl}"
                       style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;
                              font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;
                              letter-spacing:0.5px;">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;">
                Button not working? Copy and paste this link into your browser:<br/>
                <a href="${buttonUrl}" style="color:#111827;word-break:break-all;">${buttonUrl}</a>
              </p>
              ` : ""}

              ${footerNote ? `
              <p style="margin:32px 0 0;padding-top:24px;border-top:1px solid #f3f4f6;
                         font-size:13px;color:#9ca3af;text-align:center;">
                ${footerNote}
              </p>
              ` : ""}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                &copy; ${new Date().getFullYear()} Fashion Store. All rights reserved.
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

const verifyEmailTemplate = ({ firstName, verifyUrl }) =>
  baseTemplate({
    previewText: "Verify your email to start shopping at Fashion Store.",
    headerText: "Verify your email address",
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">
        Hi ${firstName},
      </p>
      <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">
        Thanks for signing up! Click the button below to verify your email address
        and activate your account. This link expires in <strong>24 hours</strong>.
      </p>
    `,
    buttonUrl: verifyUrl,
    buttonText: "Verify Email Address",
    footerNote: "If you didn't create an account with Fashion Store, you can safely ignore this email.",
  });

const resetPasswordTemplate = ({ firstName, resetUrl }) =>
  baseTemplate({
    previewText: "Reset your Fashion Store password.",
    headerText: "Reset your password",
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">
        Hi ${firstName},
      </p>
      <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">
        We received a request to reset your password. Click the button below to choose a new one.
        This link expires in <strong>1 hour</strong>.
      </p>
      <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">
        If you didn't request a password reset, you can ignore this email —
        your password will remain unchanged.
      </p>
    `,
    buttonUrl: resetUrl,
    buttonText: "Reset Password",
    footerNote: "For security, this link can only be used once and expires in 1 hour.",
  });

const welcomeTemplate = ({ firstName }) =>
  baseTemplate({
    previewText: "Welcome to Fashion Store — you're all set!",
    headerText: `Welcome, ${firstName}!`,
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">
        Your email has been verified and your account is ready to go.
      </p>
      <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.6;">
        Explore our latest collections and find your perfect style.
      </p>
    `,
    buttonUrl: null,
    buttonText: null,
    footerNote: null,
  });

module.exports = { verifyEmailTemplate, resetPasswordTemplate, welcomeTemplate };
