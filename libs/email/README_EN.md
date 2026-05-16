# Email Service

This service provides a unified email sending interface that supports multiple email service providers and internationalized email templates. Currently supports Resend, with planned support for SendGrid and SMTP.

## Email Template System

This module uses inline MJML templates to solve monorepo deployment issues, supporting multilingual email templates:

- **Verification Email** - Email verification after user registration
- **Password Reset Email** - Reset link when user forgets password
- **Supported Languages** - Chinese (`zh-CN`) and English (`en`)
- **Responsive Design** - MJML-based responsive email layout

### MJML Resources

- **[MJML Official Website](https://mjml.io/)** - Learn MJML syntax and best practices
- **[MJML Live Editor](https://mjml.io/try-it-live/)** - Real-time preview and debug email templates
- **[MJML Documentation](https://documentation.mjml.io/)** - Complete component and syntax documentation

## Configuration

Configuration is divided into two parts:
- Sensitive information (like API keys, passwords, etc.) configured through environment variables
- Non-sensitive information (like default provider, server addresses, etc.) configured directly in `config.ts`

### Environment Variables

Copy `.env.example` file to `.env` and fill in the sensitive information:

```env
# Resend Configuration (Sensitive)
RESEND_API_KEY=your_resend_api_key

# SendGrid Configuration (Sensitive)
SENDGRID_API_KEY=your_sendgrid_api_key

# SMTP Configuration (Sensitive)
SMTP_USERNAME=your_smtp_username
SMTP_PASSWORD=your_smtp_password
```

### Configuration File

Email configuration structure in `config.ts`:

```typescript
export const config = {
  email: {
    // Default email service provider
    defaultProvider: 'resend',

    // Default sender email
    defaultFrom: 'noreply@example.com',

    // Resend configuration
    resend: {
      apiKey: requireEnv('RESEND_API_KEY'),  // Sensitive: from env vars
    },

    // SendGrid configuration
    sendgrid: {
      apiKey: requireEnv('SENDGRID_API_KEY'),  // Sensitive: from env vars
    },

    // SMTP configuration
    smtp: {
      host: 'smtp.example.com',              // Fixed value
      port: 587,                             // Fixed value
      username: requireEnv('SMTP_USERNAME'), // Sensitive: from env vars
      password: requireEnv('SMTP_PASSWORD'), // Sensitive: from env vars
      secure: true,                          // Fixed value
    }
  }
};
```

## Usage

### Email Template Usage

#### Send Verification Email

```typescript
import { sendVerificationEmail } from '@libs/email';

// Send verification email after user registration
await sendVerificationEmail('user@example.com', {
  name: 'vikingmute',  // Username
  verification_url: 'https://example.com/verify?token=123',
  expiry_hours: 1,     // Expiration time (hours)
  locale: 'en'         // Language ('en' | 'zh-CN')
});
```

#### Send Password Reset Email

```typescript
import { sendResetPasswordEmail } from '@libs/email';

// Send reset email when user forgets password
await sendResetPasswordEmail('user@example.com', {
  name: 'vikingmute',  // Username
  reset_url: 'https://example.com/reset?token=456',
  expiry_hours: 1,     // Expiration time (hours)
  locale: 'en'         // Language ('en' | 'zh-CN')
});
```

### Basic Email Sending

```typescript
import { sendEmail } from '@libs/email';

// Send email using default provider
await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to our service',
  html: '<h1>Welcome!</h1><p>Thank you for signing up.</p>'
});

// Send email using specific provider
await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome',
  html: '<h1>Welcome!</h1><p>Thanks for signing up.</p>',
  provider: 'sendgrid'
});
```

### Response Format

```typescript
interface EmailResponse {
  success: boolean;        // Whether the send was successful
  id?: string;            // Email ID
  error?: {
    message: string;
    name: string;
    provider?: 'resend' | 'sendgrid' | 'smtp';
  } | null;
}
```

## Email Template Development

### Template Structure

Template files are located in the `templates/` directory:
```
templates/
├── index.ts         # Template generation functions
├── templates.ts     # MJML template content
└── README.md        # Template documentation
```

### Adding New Templates

1. Use [MJML Live Editor](https://mjml.io/try-it-live/) to design and test new templates
2. Add new MJML template string in `templates.ts`
3. Add corresponding interface and generation function in `index.ts`
4. Add corresponding translation text in `i18n/locales/`
5. Add sending function in `templates-sender.ts`

### Template Features

- **Inline Deployment** - Template content embedded in code, solving monorepo deployment issues
- **Multilingual Support** - Based on `@libs/i18n` translation system
- **Responsive Design** - Uses MJML to ensure proper email display across devices
- **Placeholder Replacement** - Automatically handles `{{name}}`, `{{expiry_hours}}`, `{{year}}` variables

## Adding New Service Providers

1. Add required sensitive information for the new provider in `.env.example` and `.env`
2. Add new provider configuration in `config.ts` under the `email` config (separate sensitive and non-sensitive information)
3. Create new provider implementation file in the `providers` directory
4. Add new provider to `EmailProvider` type in `types.ts`
5. Add new case handling in `email-sender.ts`

## Important Notes

- Ensure all required environment variables are properly configured (sensitive information only)
- Configure non-sensitive information directly in `config.ts`
- Different providers may require different configuration parameters
- Error handling and retry mechanisms are recommended in production environments
- Templates use inline approach, no need to worry about file path issues during monorepo builds

## MJML Template Development

### Using MJML Live Editor

When developing new email templates or modifying existing ones, you can use MJML's official online editor:

**[MJML Live Editor](https://mjml.io/try-it-live/)**

#### How to use:
1. Copy the MJML code from `templates.ts` into the left editor
2. The rendered email will be displayed in real-time on the right
3. Switch between mobile and desktop view to test responsiveness
4. Use the built-in preview to test different email clients

#### Quick Start Template:
```mjml
<mjml>
  <mj-head>
    <mj-title>Your Email Title</mj-title>
  </mj-head>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>Hello {{name}}, welcome to our service!</mj-text>
        <mj-button href="{{action_url}}">Get Started</mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

## Framework Integration Examples

### Next.js API Routes

```typescript
// pages/api/auth/register.ts
import { sendVerificationEmail } from '@libs/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, name, locale = 'en' } = req.body;
    // Create user, generate token, etc...
    
    await sendVerificationEmail(email, {
      name,
      verification_url: `https://your-app.com/verify?token=your-token`,
      expiry_hours: 1,
      locale // Get language setting from request
    });
    
    return res.status(200).json({ message: 'Verification email sent' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to send email', error: error.message });
  }
}
```

### Nuxt Server Routes

```typescript
// server/api/auth/register.ts
import { sendVerificationEmail } from '@libs/email';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, name, locale = 'en' } = body;
  
  try {
    // Create user, generate token, etc...
    
    await sendVerificationEmail(email, {
      name,
      verification_url: `https://your-app.com/verify?token=your-token`,
      expiry_hours: 1,
      locale // Get language setting from request
    });
    
    return { message: 'Verification email sent' };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to send email',
      data: error
    });
  }
});
```

## Supported Languages

The templates currently support the following languages:
- English (`en`)
- Simplified Chinese (`zh-CN`)

You can specify which language to use by adding the `locale` property in the parameters. 