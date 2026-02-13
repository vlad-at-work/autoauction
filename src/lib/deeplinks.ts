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

  const parts = param.split(':');
  const context = parts[0] as NotificationContext;
  const resourceId = parts[1] || null;

  // Validate context
  const validContexts: NotificationContext[] = ['inquiry', 'offer', 'transaction', 'dashboard'];

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
        const [inquiryId, offerId] = resourceId.split(':');
        if (inquiryId && offerId) {
          return `/app/inquiry/${inquiryId}/offer/${offerId}`;
        }
      }
      return '/app/dashboard';
    case 'transaction':
      return resourceId ? `/app/dashboard?transaction=${resourceId}` : '/app/dashboard';
    case 'dashboard':
      return '/app/dashboard';
    default:
      return '/app/dashboard';
  }
}
