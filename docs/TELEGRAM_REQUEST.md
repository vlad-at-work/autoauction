# Analogous Methods to `request_contact` in Telegram: Capabilities and Data Revealed

## 1. Core Analogous Methods Across Telegram Platforms

### 1.1 Telegram Bot API: `request_contact` Parameter

#### 1.1.1 Implementation Mechanism

The **Bot API** implements contact requests through the **`KeyboardButton`** object, where developers set **`request_contact: true`** to transform a standard button into a contact-sharing trigger. This mechanism operates exclusively within **private chats** and requires careful attention to the nested array structure that defines reply keyboards. The `reply_markup` parameter must contain a `keyboard` array consisting of row arrays, each properly encapsulating button objects with `text` and `request_contact` properties.

When a bot sends a message with **`ReplyKeyboardMarkup`** containing a contact request button, the Telegram client renders a custom keyboard at the bottom of the chat interface. Pressing this button triggers a **native confirmation dialog** that cannot be bypassed programmatically—ensuring contact information is only transmitted with **explicit informed consent**. The private chat restriction represents a deliberate security boundary, preventing unauthorized contact harvesting in group environments.

The JSON structure demands precise formatting. Each keyboard row must be a nested array, with button objects specifying both display text and the request flag. Critical configuration parameters include **`one_time_keyboard: true`** (for automatic dismissal after use) and **`resize_keyboard: true`** (for optimal display across device sizes). Common implementation errors involve flattening the keyboard structure incorrectly or omitting these UX-optimizing parameters.

#### 1.1.2 Data Revealed Upon User Consent

Upon user approval, the Bot API transmits a **Contact object** with four core identity fields. The **`phone_number`** is the primary field—provided in **international format** with country code and all significant digits, enabling direct programmatic use without regional parsing. The **`first_name`** is mandatory and populated from the user's Telegram profile, while **`last_name`** is optional and may be null. The **`user_id`** provides a **persistent identifier** that remains consistent across phone number changes or profile updates, enabling stable user recognition.

| Field          | Type    | Required | Description                                |
| -------------- | ------- | -------- | ------------------------------------------ |
| `phone_number` | String  | Yes      | International format (e.g., "+1234567890") |
| `first_name`   | String  | Yes      | From Telegram profile                      |
| `last_name`    | String  | No       | May be null                                |
| `user_id`      | Integer | No       | Persistent Telegram identifier             |

**Notably absent** from this structure is any built-in cryptographic verification. The received data should be treated as **provisionally authentic**, with additional verification steps recommended for security-sensitive applications.

### 1.2 Telegram Mini Apps (TMA): `requestContact` Method

#### 1.2.1 Implementation Mechanism

**Telegram Mini Apps** provide **`requestContact`** as a **JavaScript SDK method** (`telegram.requestContact()` or `@tma.js/sdk`), offering a fundamentally different architectural approach. This **promise-based asynchronous API** operates within the embedded web application runtime, returning contact data directly through promise resolution rather than server-side message handling.

The invocation pattern follows modern JavaScript conventions:

```javascript
// Standard implementation with SDK
import { requestContact } from '@tma.js/sdk';

async function handleContactRequest() {
  try {
    const contact = await requestContact();
    // Process contact with security fields
  } catch (error) {
    // Handle user decline or technical error
  }
}
```

**Version compatibility is mandatory**—developers must verify `telegram.isVersionAtLeast()` before invocation, as `requestContact` requires specific minimum versions of both the Telegram client and TMA SDK. The method triggers the same **native confirmation dialog** as the Bot API, with platform-managed presentation preventing spoofing or confused deputy attacks.

#### 1.2.2 Data Revealed Upon User Consent

The Mini Apps response **substantially enriches** the Bot API structure with **two critical security fields**:

| Field                  | Type                     | Security Function            |
| ---------------------- | ------------------------ | ---------------------------- |
| `contact.phone_number` | String                   | Primary identity             |
| `contact.first_name`   | String                   | Identity confirmation        |
| `contact.last_name`    | String                   | Additional context           |
| `contact.user_id`      | Integer                  | Persistent recognition       |
| **`auth_date`**        | Integer (Unix timestamp) | **Replay attack prevention** |
| **`hash`**             | String (HMAC-SHA256)     | **Origin verification**      |

The **`auth_date`** field anchors the response temporally, enabling servers to enforce **freshness requirements** and reject stale data. The **`hash`** field implements **HMAC-SHA256 verification** using the bot token as secret key, allowing definitive proof that contact data originated from the legitimate Telegram platform without tampering. This transforms contact data from simple information into **cryptographically verifiable identity assertions** suitable for high-assurance authentication decisions.

## 2. Comparative Analysis of Methods

### 2.1 Functional Parallels

#### 2.1.1 Shared Characteristics

Both methods embody Telegram's **privacy-first design philosophy** through three inviolable principles:

- **Explicit user consent is absolute**—no silent or automated retrieval is possible
- **Private chat restriction**—both disabled in groups and channels
- **Identical core identity data**—phone, names, and persistent user ID

The user experience flow demonstrates remarkable consistency: native dialogs clearly present the requesting application's identity, with platform-controlled presentation preventing manipulation of consent context.

#### 2.1.2 Platform-Specific Differences

| Aspect                    | Bot API `request_contact`                         | Mini Apps `requestContact`             |
| ------------------------- | ------------------------------------------------- | -------------------------------------- |
| **Integration pattern**   | Server-side message handling via webhooks/polling | Client-side promise resolution         |
| **Response timing**       | Asynchronous (update delivery)                    | Synchronous (within interaction)       |
| **Security verification** | None built-in                                     | HMAC-SHA256 + timestamp                |
| **Infrastructure**        | Requires webhook/long-polling endpoint            | None for initial request               |
| **Server processing**     | Direct field access                               | Hash verification required             |
| **Fallback complexity**   | Graceful degradation to manual entry              | Version compatibility checks mandatory |

These architectural differences create **distinct security postures**: the Bot API prioritizes simplicity and broad compatibility, while Mini Apps emphasize cryptographic assurance at the cost of implementation complexity.

### 2.2 Security and Verification Layers

#### 2.2.1 Bot API Approach

The absence of built-in verification means **transport security (HTTPS/TLS)** provides the primary protection boundary. For security-critical applications, **supplementary measures are essential**:

- SMS confirmation codes to received phone numbers
- Time-delayed acknowledgment workflows
- Correlation with existing verified database records

Received contact data should be **logged and audited** with appropriate access controls, recognizing that plain-text storage increases exposure risk.

#### 2.2.2 Mini Apps Approach

The **comprehensive security architecture** supports regulatory-compliant strong customer authentication:

| Verification Step        | Purpose                  | Implementation                                                  |
| ------------------------ | ------------------------ | --------------------------------------------------------------- |
| `auth_date` validation   | Freshness enforcement    | Reject responses outside tolerance window (typically ≤24 hours) |
| Field concatenation      | Consistent hash input    | Precise order per Telegram specification                        |
| HMAC-SHA256 computation  | Origin proof             | Bot token as secret key                                         |
| Constant-time comparison | Timing attack prevention | Avoid early-exit string comparison                              |

**Production-ready workflow**: receive → validate timestamp → concatenate fields → compute hash → constant-time compare → log result → process trusted data or reject. Failed verifications should trigger **security alerts** as potential attack indicators.

## 3. Technical Implementation Details

### 3.1 Bot API Integration Patterns

#### 3.1.1 Message Handling Workflow

The complete workflow spans three phases with specific technical requirements:

| Phase           | Action                                                  | Critical Details                                                          |
| --------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Initiation**  | Send `ReplyKeyboardMarkup` with `request_contact: true` | Nested array structure: `[[{text, request_contact}]]`                     |
| **Interaction** | Client renders button, user approves native dialog      | No bot visibility into decline decisions                                  |
| **Processing**  | Receive `Update` with `Message.contact`                 | Type-aware parsing required—check `message.contact` before `message.text` |

The **type detection requirement** is frequently overlooked. Contact-sharing responses populate `message.contact`, not `message.text`, causing silent failures in handlers that assume text-only messages.

#### 3.1.2 Common Implementation Pitfalls

| Pitfall                      | Symptom                                     | Resolution                                       |
| ---------------------------- | ------------------------------------------- | ------------------------------------------------ |
| Incorrect keyboard nesting   | Button displays but doesn't trigger sharing | Use array-of-arrays: `[[button]]` not `[button]` |
| Missing type handling        | Silent message drops or errors              | Implement `if (message.contact)` branching       |
| Omitting `one_time_keyboard` | Persistent keyboard confuses users          | Always set `one_time_keyboard: true`             |
| No decline detection         | Ambiguous silence after button press        | Implement timeout or follow-up messaging         |

### 3.2 Mini Apps Integration Patterns

#### 3.2.1 SDK Invocation Flow

**Defensive implementation** requires capability detection before invocation:

```javascript
// Production-ready pattern with version check
if (telegram.isVersionAtLeast('6.9')) {
  try {
    const result = await telegram.requestContact();
    await secureServerSubmission(result); // HTTPS + request signing
  } catch (err) {
    showAlternativeAuth(); // Graceful degradation
  }
} else {
  promptClientUpdate(); // Clear version requirement messaging
}
```

The **client-to-server transmission** is security-critical—use HTTPS, implement request signing, and validate hash immediately upon receipt.

#### 3.2.2 Server-Side Verification

| Step | Operation                            | Security Purpose                       |
| ---- | ------------------------------------ | -------------------------------------- |
| 1    | Receive contact data from client     | Initiate verification                  |
| 2    | Validate `auth_date` freshness       | Prevent replay attacks                 |
| 3    | Concatenate fields per specification | Ensure consistent hash input           |
| 4    | Compute HMAC-SHA256 with bot token   | Generate verification hash             |
| 5    | Constant-time comparison             | Detect tampering, prevent timing leaks |
| 6    | Log verification result              | Enable security monitoring             |
| 7    | Process trusted data or reject       | Complete authentication decision       |

**Performance consideration**: hash verification overhead is minimal, but high-volume services may cache verified results with **short cache windows** (minutes, not hours) to preserve freshness guarantees.

## 4. Privacy Constraints and Limitations

### 4.1 Universal Restrictions

#### 4.1.1 User Control Requirements

**Three inviolable constraints** govern all contact request methods:

- **No silent retrieval**—platform-managed dialogs prevent automation
- **Decline is invisible**—no notification to bots when users refuse
- **No ID-to-phone resolution**—impossible to retrieve phone numbers from `user_id` alone

Each contact request requires **fresh user consent**—no persistent permissions exist. This maximizes user awareness but increases friction for multi-session applications.

#### 4.1.2 Context Limitations

| Constraint                   | Enforcement             | Implication                         |
| ---------------------------- | ----------------------- | ----------------------------------- |
| Private chats only           | API-level blocking      | Groups and channels excluded        |
| Active conversation required | Messaging policy        | No unsolicited contact requests     |
| Rate limiting                | Undocumented thresholds | Implement reasonable request pacing |

### 4.2 Platform-Specific Constraints

| Constraint                 | Bot API                         | Mini Apps                              |
| -------------------------- | ------------------------------- | -------------------------------------- |
| **Directionality**         | One-way (UI-triggered only)     | Bidirectional within Web App context   |
| **Permission persistence** | None—fresh consent every time   | None—fresh consent every time          |
| **Context requirement**    | Any private chat message        | Requires Web App launch                |
| **Compatibility**          | Universal client support        | Version checks mandatory               |
| **Verification burden**    | Developer-implemented if needed | Server-side hash verification required |

## 5. Related and Extended Methods

### 5.1 Complementary Request Methods

#### 5.1.1 Location Requests

**Parallel structure** for geographic data:

| Platform  | Method                   | Returns                                 |
| --------- | ------------------------ | --------------------------------------- |
| Bot API   | `request_location: true` | `Location` object (latitude, longitude) |
| Mini Apps | `requestLocation()`      | `Location` + `auth_date` + `hash`       |

Same privacy constraints and implementation patterns apply—native dialog, explicit consent, private chats only.

#### 5.1.2 Enhanced User Selection

Modern Bot API provides **flexible selection beyond single contacts**:

| Method          | Object                       | Capability                                     |
| --------------- | ---------------------------- | ---------------------------------------------- |
| `request_users` | `KeyboardButtonRequestUsers` | Multi-user selection with filtering            |
| `request_chat`  | `KeyboardButtonRequestChat`  | Group/channel selection with permission checks |

These support complex workflows (group formation, referrals, administrative operations) with configurable criteria such as "bot administrators only" or "groups where bot is member."

### 5.2 Method Evolution and Deprecation

#### 5.2.1 Historical Changes

| Period | Change                                       | Impact                                      |
| ------ | -------------------------------------------- | ------------------------------------------- |
| 2016   | Initial `request_contact`/`request_location` | Foundation established                      |
| 2020+  | `web_app` button introduction                | Mini App ecosystem enabled                  |
| 2021+  | `request_users`/`request_chat` added         | Enhanced selection flexibility              |
| 2022+  | `request_user` **deprecated and removed**    | Migration to flexible alternatives required |

#### 5.2.2 Current Best Practices

| Scenario                                 | Recommended Method               | Rationale                                           |
| ---------------------------------------- | -------------------------------- | --------------------------------------------------- |
| Simple single-user identification (bots) | `request_contact`                | Minimal complexity, universal compatibility         |
| High-assurance authentication            | `requestContact` (Mini Apps)     | Cryptographic verification built-in                 |
| Multi-user selection                     | `request_users`                  | Flexible filtering, single interaction              |
| Mini App native experience               | `requestContact` directly        | Streamlined UX, security fields included            |
| Mixed bot/Mini App user base             | Hybrid with graceful degradation | Maximize reach while leveraging modern capabilities |

**Critical decision factor**: choose based on **security requirements versus implementation complexity**. The Bot API suffices for convenience features; Mini Apps are essential for financial, healthcare, or government services requiring strong customer authentication.
