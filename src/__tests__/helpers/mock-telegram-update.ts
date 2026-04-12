/**
 * Telegram update shape builders for webhook handler tests.
 * All chat_ids default to a realistic fake value.
 */

const DEFAULT_CHAT_ID = 100000001;
const DEFAULT_USER_ID = 100000001;

function baseUser(chatId = DEFAULT_USER_ID) {
  return {
    id: chatId,
    is_bot: false,
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser',
    language_code: 'ru',
  };
}

function baseChat(chatId = DEFAULT_CHAT_ID) {
  return {
    id: chatId,
    first_name: 'Test',
    type: 'private',
  };
}

/** /start command, optionally with a deep-link payload */
export function makeStartUpdate(chatId = DEFAULT_CHAT_ID, payload?: string) {
  const text = payload ? `/start ${payload}` : '/start';
  return {
    update_id: 1,
    message: {
      message_id: 1,
      from: baseUser(chatId),
      chat: baseChat(chatId),
      date: Math.floor(Date.now() / 1000),
      text,
      ...(payload
        ? { entities: [{ offset: 0, length: 6, type: 'bot_command' }] }
        : { entities: [{ offset: 0, length: 6, type: 'bot_command' }] }),
    },
  };
}

/** User shares their phone number (contact message) */
export function makeContactUpdate(
  chatId = DEFAULT_CHAT_ID,
  phone = '79161234567',
  firstName = 'Test'
) {
  return {
    update_id: 2,
    message: {
      message_id: 2,
      from: baseUser(chatId),
      chat: baseChat(chatId),
      date: Math.floor(Date.now() / 1000),
      contact: {
        phone_number: phone,
        first_name: firstName,
        user_id: chatId,
      },
    },
  };
}

/** Plain text message */
export function makeTextUpdate(chatId = DEFAULT_CHAT_ID, text: string) {
  return {
    update_id: 3,
    message: {
      message_id: 3,
      from: baseUser(chatId),
      chat: baseChat(chatId),
      date: Math.floor(Date.now() / 1000),
      text,
    },
  };
}

/** Callback query (inline button press) */
export function makeCallbackUpdate(chatId = DEFAULT_CHAT_ID, data: string) {
  return {
    update_id: 4,
    callback_query: {
      id: 'cq1',
      from: baseUser(chatId),
      message: {
        message_id: 10,
        chat: baseChat(chatId),
        date: Math.floor(Date.now() / 1000),
        text: 'some message',
      },
      data,
    },
  };
}
