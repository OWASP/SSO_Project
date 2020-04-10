describe('Guest activity', () => {
	beforeEach(() => {
		cy.clearData();
	});
	
	xit('Registers a new account', () => {
		cy.visit('/');
		cy.get('.mt-4 > a').click();

		cy.get('#email').type(Cypress.env("emailAddress"));
		cy.get('#agree').check({force: true});
		cy.get('.btn').click();
		cy.get('.alert-success').should('be.visible');

		cy.get('.mt-4 > .router-link-active').click();
		
		cy.getLastEmailBody().then(email => {
			expect(email.link.endpoint).to.equal("register");
			cy.visit(email.link.path);
			
			cy.get('#password').type(Cypress.env("basePassword"));
			cy.get('#confirm').type(Cypress.env("basePassword"));
			cy.get('.btn').click();
		
			cy.endLoggedIn();
		});
	});
	
	xit("Can authenticate via email", () => {
		cy.registerUser();
		
		cy.visit('/');

		cy.get('#email').type(Cypress.env("emailAddress"));
		cy.get('#password').type(Cypress.env("basePassword"));
		cy.get('.btn').click();
		
		cy.get('#confirmEmail').click();
		cy.get('.alert-success').should('be.visible');
		
		cy.getLastEmailBody().then(email => {
			expect(email.link.endpoint).to.equal("two-factor");
			cy.visit(email.link.path);
			
			cy.endLoggedIn();
		});
	});
	
	xit("Can reset/change password", () => {
		cy.registerUser();
		
		cy.visit('/');
		cy.get('.float-right').click();
		cy.get('#email').type(Cypress.env("emailAddress"));
		cy.get('.btn').click();
		
		cy.get('.alert-success').should('be.visible');
		
		cy.getLastEmailBody().then(email => {
			expect(email.link.endpoint).to.equal("change-password");
			cy.visit(email.link.path);
			
			const altPass = Cypress.env("basePassword") + "4";
			cy.get('#password').type(altPass);
			cy.get('#confirm').type(altPass);
			cy.get('.btn').click();
			
			cy.endLoggedIn();
		});
	});
	
	it("Shows about data", () => {
		cy.visit('/');
		
		cy.get("[href='#/about']").click();
		cy.get("#title-security").click();
		
		cy.get('.about-banner').should('be.visible');
		
		cy.get(".brand img").click();
		cy.url().should('match', /#\/$/);
	});
});