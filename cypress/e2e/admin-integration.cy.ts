/**
 * Admin Integration Tests
 *
 * Tests admin functionality:
 * - Dealer CRUD
 * - Buyer management
 * - Inquiry management
 *
 * Uses Basic Auth for admin access
 */

describe('Admin Integration', () => {
  const testPrefix = 'test_' + Date.now();
  let dealerId: string;
  let buyerId: string;

  beforeEach(() => {
    cy.loginAsAdmin();
  });

  describe('Dealer Management', () => {
    it('should create a dealer', () => {
      cy.adminRequest('POST', '/api/admin/dealers', {
        username: `${testPrefix}_dealer`,
        name: 'Test Dealer',
        subName: 'Test Auto Center',
        phone: '+79001234567',
        email: 'dealer@test.com',
        description: 'Test dealer for Cypress',
        active: true,
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 201]);
        if (response.body && typeof response.body === 'object' && 'id' in response.body) {
          dealerId = response.body.id as string;
          cy.log(`Created dealer: ${dealerId}`);
        }
      });
    });

    it('should update dealer', () => {
      if (!dealerId) {
        cy.log('No dealer to update - skipping');
        return;
      }

      cy.adminRequest('PATCH', `/api/admin/dealers/${dealerId}`, {
        name: 'Updated Dealer Name',
        phone: '+79009876543',
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 204]);
      });
    });

    it('should list dealers', () => {
      cy.adminRequest('GET', '/api/admin/dealers').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });
  });

  describe('Buyer Management', () => {
    it('should create a buyer', () => {
      cy.adminRequest('POST', '/api/admin/buyers', {
        platform: 'TELEGRAM',
        platformUserId: `${testPrefix}_buyer`,
        platformUserName: 'Test Buyer',
        platformChatId: '123456',
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 201]);
        if (response.body && typeof response.body === 'object' && 'id' in response.body) {
          buyerId = response.body.id as string;
          cy.log(`Created buyer: ${buyerId}`);
        }
      });
    });

    it('should list buyers', () => {
      cy.adminRequest('GET', '/api/admin/buyers').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });
  });

  describe('Inquiry Management', () => {
    it('should list inquiries', () => {
      cy.adminRequest('GET', '/api/admin/inquiries').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });
  });

  after(() => {
    // Clean up test data
    cy.request('POST', '/api/debug/clear-db', { prefix: testPrefix });
  });
});
