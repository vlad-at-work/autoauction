/**
 * Deep Links for Mini-App Navigation
 *
 * This module handles navigation within the buyer mini-app.
 * Platform-specific bot integration has been removed.
 */

export type NotificationContext =
  | 'inquiry' // Link to specific inquiry
  | 'offer' // Link to specific offer
  | 'transaction' // Link to accepted transaction
  | 'accepted' // Link to accepted offer (dealer notification)
  | 'dashboard'; // Link to main dashboard

/**
 * Parse startapp parameter in the mini-app
 *
 * This should be called on app initialization to determine navigation
 *
 * Usage in your React/Next component:
 * const startParam = Telegram.WebApp.initDataUnsafe.tgWebAppStartParam
 *                 || WebApp.initDataUnsafe?.start_param;
 * const { context, resourceId } = parseStartParam(startParam);
 */
export function parseStartParam(param?: string): {
  context: NotificationContext | null;
  resourceId: string | null;
} {
  if (!param) {
    return { context: null, resourceId: null };
  }

  // Support both : (legacy) and _ (MAX-compatible) separators
  const sepIndex = Math.max(param.indexOf('_'), param.indexOf(':'));
  const sep = sepIndex > 0 ? param[sepIndex] : ':';
  const parts = param.split(sep);
  const context = parts[0] as NotificationContext;
  // For offer context, resourceId includes both inquiryId and offerId (e.g., "inquiryId_offerId")
  // For other contexts, resourceId is just the ID
  const resourceId = parts.slice(1).join(sep) || null;

  // Validate context
  const validContexts: NotificationContext[] = [
    'inquiry',
    'offer',
    'transaction',
    'accepted',
    'dashboard',
  ];

  if (!validContexts.includes(context)) {
    return { context: null, resourceId: null };
  }

  return { context, resourceId };
}

/**
 * Generate a deep link path for internal navigation
 * Returns the internal app path for the given context
 */
export function getInternalPath(context: NotificationContext, resourceId?: string): string {
  switch (context) {
    case 'inquiry':
      return resourceId ? `/app/inquiry/${resourceId}` : '/app/dashboard';
    case 'offer':
      if (resourceId) {
        // Support both : (legacy) and _ (MAX-compatible) separators
        const [inquiryId, offerId] = resourceId.includes('_')
          ? resourceId.split('_')
          : resourceId.split(':');
        if (inquiryId && offerId) {
          return `/app/inquiry/${inquiryId}/offer/${offerId}`;
        }
      }
      return '/app/dashboard';
    case 'accepted':
      return resourceId ? `/dealerinterface/inquiries/${resourceId}` : '/dealerinterface/inquiries';
    case 'transaction':
      return resourceId ? `/app/dashboard?transaction=${resourceId}` : '/app/dashboard';
    case 'dashboard':
      return '/app/dashboard';
    default:
      return '/app/dashboard';
  }
}
