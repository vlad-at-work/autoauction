/**
 * MAX Bot API Registration Commands
 *
 * This file contains commands to register and configure a MAX bot.
 * Run these commands to set up webhook, verify bot, and test messaging.
 *
 * EXCEPTION: This file is created as .ts but follows the spirit of
 * not creating new .md documentation files.
 */

interface MaxApiCommand {
  method: 'POST' | 'GET' | 'DELETE';
  endpoint: string;
  description: string;
  body?: Record<string, any>;
  headers: Record<string, string>;
  curl?: string;
}

/**
 * Generate curl commands for MAX bot registration
 */
export function createMaxRegistrationCommands(
  botToken: string,
  webhookUrl: string
): MaxApiCommand[] {
  return [
    {
      method: 'GET',
      endpoint: 'https://platform-api.max.ru/me',
      description: 'Verify bot token and get bot info',
      headers: { Authorization: botToken },
      curl: `curl -X GET https://platform-api.max.ru/me \\
  -H "Authorization: ${botToken}"`,
    },
    {
      method: 'POST',
      endpoint: 'https://platform-api.max.ru/subscriptions',
      description: 'Register webhook for receiving updates',
      body: { url: webhookUrl },
      headers: {
        Authorization: botToken,
        'Content-Type': 'application/json',
      },
      curl: `curl -X POST https://platform-api.max.ru/subscriptions \\
  -H "Authorization: ${botToken}" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "${webhookUrl}"}'`,
    },
    {
      method: 'GET',
      endpoint: 'https://platform-api.max.ru/subscriptions',
      description: 'Check registered webhook status',
      headers: { Authorization: botToken },
      curl: `curl -X GET https://platform-api.max.ru/subscriptions \\
  -H "Authorization: ${botToken}"`,
    },
    {
      method: 'DELETE',
      endpoint: 'https://platform-api.max.ru/subscriptions',
      description: 'Unregister webhook (if needed)',
      headers: { Authorization: botToken },
      curl: `curl -X DELETE https://platform-api.max.ru/subscriptions \\
  -H "Authorization: ${botToken}"`,
    },
  ];
}

/**
 * Register webhook with MAX platform
 */
export async function registerMaxWebhook(
  botToken: string,
  webhookUrl: string
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const response = await fetch('https://platform-api.max.ru/subscriptions', {
      method: 'POST',
      headers: {
        Authorization: botToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: webhookUrl }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
        data,
      };
    }

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Verify webhook is registered
 */
export async function verifyMaxWebhook(
  botToken: string
): Promise<{ success: boolean; registered?: boolean; url?: string; error?: string }> {
  try {
    const response = await fetch('https://platform-api.max.ru/subscriptions', {
      method: 'GET',
      headers: { Authorization: botToken },
    });

    const data = (await response.json()) as any;

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    return {
      success: true,
      registered: !!data.url,
      url: data.url,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Unregister webhook from MAX platform
 */
export async function unregisterMaxWebhook(
  botToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://platform-api.max.ru/subscriptions', {
      method: 'DELETE',
      headers: { Authorization: botToken },
    });

    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.error };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Get bot info from MAX
 */
export async function getMaxBotInfo(
  botToken: string
): Promise<{ success: boolean; botInfo?: any; error?: string }> {
  try {
    const response = await fetch('https://platform-api.max.ru/me', {
      method: 'GET',
      headers: { Authorization: botToken },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    return { success: true, botInfo: data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Send test message to verify messaging API works
 */
export async function sendMaxTestMessage(
  botToken: string,
  chatId: number
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch('https://platform-api.max.ru/messages', {
      method: 'POST',
      headers: {
        Authorization: botToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: '✅ Test message from AutoAuction Bot\n\nIf you see this, the bot is working!',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    return {
      success: true,
      messageId: data.result?.message_id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Print registration instructions
 */
export function printMaxRegistrationInstructions(
  botToken: string,
  webhookUrl: string
): string {
  const commands = createMaxRegistrationCommands(botToken, webhookUrl);

  return `
╔════════════════════════════════════════════════════════════════════╗
║           MAX Bot Registration & Setup Instructions               ║
╚════════════════════════════════════════════════════════════════════╝

Bot Token: ${botToken.substring(0, 20)}...
Webhook URL: ${webhookUrl}

Step 1: Verify bot token
${commands[0].curl}

Step 2: Register webhook
${commands[1].curl}

Step 3: Verify webhook is registered
${commands[2].curl}

Step 4: To unregister webhook (if needed)
${commands[3].curl}

═══════════════════════════════════════════════════════════════════

Expected Success Response for Registration:
{
  "ok": true,
  "result": {
    "url": "${webhookUrl}"
  }
}

Expected Error Messages:
- "Invalid token" → Check MAX_BOT_TOKEN in environment
- "Invalid URL" → Check WEBHOOK_URL is publicly accessible
- "Webhook already registered" → Run unregister command first

═══════════════════════════════════════════════════════════════════
`;
}
