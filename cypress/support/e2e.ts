// Cypress E2E support file
import '@testing-library/cypress/add-commands';

// Mock auth helper for testing
Cypress.Commands.add(
  'mockAuth',
  (platform: 'telegram' | 'max', userId: string, botType: 'customer' | 'dealer' = 'customer') => {
    const token = `Bearer mock:${platform}:${botType}:${userId}`;
    cy.wrap(token).as('authToken');
    return cy.wrap(token);
  }
);

// Login as buyer (customer)
Cypress.Commands.add('loginAsBuyer', (userId: string = 'test_buyer_123') => {
  return cy.mockAuth('telegram', userId, 'customer');
});

// Login as dealer
Cypress.Commands.add('loginAsDealer', (userId: string = 'test_dealer_123') => {
  return cy.mockAuth('telegram', userId, 'dealer');
});

// API request with mock auth
Cypress.Commands.add('apiWithAuth', (method: string, url: string, body?: object) => {
  cy.get<string>('@authToken').then((token) => {
    return cy.request({
      method,
      url,
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body,
      failOnStatusCode: false,
    });
  });
});

// Admin login (Basic Auth)
Cypress.Commands.add('loginAsAdmin', () => {
  const username = Cypress.env('ADMIN_USERNAME') || 'admin';
  const password = Cypress.env('ADMIN_PASSWORD') || 'admin';
  cy.wrap(btoa(`${username}:${password}`)).as('adminAuth');
});

// Admin API request
Cypress.Commands.add('adminRequest', (method: string, url: string, body?: object) => {
  cy.get<string>('@adminAuth').then((auth) => {
    return cy.request({
      method,
      url,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body,
      failOnStatusCode: false,
    });
  });
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      mockAuth(
        platform: 'telegram' | 'max',
        userId: string,
        botType?: 'customer' | 'dealer'
      ): Chainable<string>;
      loginAsBuyer(userId?: string): Chainable<string>;
      loginAsDealer(userId?: string): Chainable<string>;

      apiWithAuth(method: string, url: string, body?: object): Chainable<Cypress.Response<unknown>>;
      loginAsAdmin(): Chainable<void>;

      adminRequest(
        method: string,
        url: string,
        body?: object
      ): Chainable<Cypress.Response<unknown>>;
    }
  }
}
