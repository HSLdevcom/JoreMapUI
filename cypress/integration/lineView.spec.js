describe('LineView tests', () => {
    beforeEach(() => {
        cy.hslLoginReadAccess();
        cy.getTestElement('authInfo').should('exist');
        cy.getTestElement('lineSearch').should('exist');
        cy.getTestElement('lineItem', { timeout: 10000 })
            .first()
            .click();
        cy.getTestElement('lineView').should('exist');
    });

    it('Can open lineHeader', () => {
        cy.getTestElement('lineHeaderButton', { timeout: 10000 })
            .first()
            .click();
        cy.getTestElement('activeLineHeaderName').should('exist');
    });

    it('Can open routes tab', () => {
        cy.getTestElement('tab')
            .contains('Reitit')
            .click();
        cy.getTestElement('lineRoutesTabView').should('exist');
    });
});