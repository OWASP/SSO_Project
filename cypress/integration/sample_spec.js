describe('Guest activity', () => {
	xit('Registers a new account', () => {
		cy.visit('/');
		cy.get('.mt-4 > a').click();

		cy.get('#email').type(Cypress.env("emailAddress"));
		cy.get('#agree').check({force: true});
		cy.get('.btn').click();
		cy.get('.alert-success').should('be.visible');

		cy.get('.mt-4 > .router-link-active').click();
		
		cy.getLastEmailBody().then(email => {
			cy.visit(email.link.path);
			
			cy.get('#password').type(Cypress.env("basePassword"));
			cy.get('#confirm').type(Cypress.env("basePassword"));
			cy.get('.btn').click();
		
			cy.url().should('include', '/audit');
			cy.get('.mt-4 > .btn-warning').click();
		});
	});
	
	it("Can login via email", () => {
		cy.visit('/');

		cy.get('#email').type(Cypress.env("emailAddress"));
		cy.get('#password').type(Cypress.env("basePassword"));
		cy.get('.btn').click();
		
		cy.get('#confirmEmail').click();
		cy.get('.alert-success').should('be.visible');
		
		cy.getLastEmailBody().then(email => {
			cy.visit(email.link.path);
			
			cy.url().should('include', '/audit');
			cy.get('.mt-4 > .btn-warning').click();
		});
	});
});