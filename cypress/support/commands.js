// Get all emails
Cypress.Commands.add('getEmails', () => {
	cy.request("http://"+Cypress.env("MAILHOST")+":8025/api/v2/messages").its("body");
});

// Just get the last email
Cypress.Commands.add('getLastEmail', () => {
	return cy.getEmails().then(emails => {
		let result = null;
		if(emails.count > 0) {
			const sortedItems = emails.items.slice().sort((a, b) => b.Created - a.Created);
			result = sortedItems[0];
		}
		return cy.wrap(result);
    });
});

// Only get the relevant parts from the last email, mostly used
Cypress.Commands.add('getLastEmailBody', () => {
	return cy.getLastEmail().then(email => {
		const body = email.Content.Body.replace(/=\s+/g, "");
		const linkParts = body.match(/(https?:\/\/([^\/]+?)\/#(\/([^\/]+?)(?:(?:\/)([^\/]+?))?))\s*----/);
		const link = {
			full: linkParts[1],
			host: linkParts[2],
			path: linkParts[3],
			endpoint: linkParts[4],
		};
		if(linkParts.length > 4) {
			link.token = linkParts[5];
		}
		
		return cy.wrap({
			body,
			link,
		});
	});
});

// Check if user is logged in
Cypress.Commands.add('isAuthenticated', () => {
	cy.url().should('include', '/audit');
});

// Check if user is at landing page (= login)
Cypress.Commands.add('isGuest', () => {
	cy.url().should('match', /#\/$/);
});

// Expect number of audit logs
Cypress.Commands.add('expectLogIncrease', num => {
	cy.get(".data-logs .accordion-row").should("have.length", Cypress.env("logLogCount") + num);
});

// Shortcut to log in (-> showing 2fa screen)
Cypress.Commands.add('login', () => {
	cy.registerUser(); // If we need a login, we will need the user as well
	cy.visit('/');

	cy.get('#email').type(Cypress.env("emailAddress"));
	cy.get('#password').type(Cypress.env("basePassword"));
	cy.get('.btn').click();
});

// Shortcut to authenticate (login+2fa)
Cypress.Commands.add('authenticate', () => {
	cy.login();
	
	cy.get('#confirmEmail').click();
	cy.get('.alert-success').should('be.visible');
	
	cy.wait(1000);
	cy.getLastEmailBody().then(email => {
		expect(email.link.endpoint).to.equal("two-factor");
		cy.visit(email.link.path);
		cy.isAuthenticated();
		
		cy.wrap(true);
	});
});

// Assumes you're on /audit
Cypress.Commands.add('logout', () => {
	cy.get('#logout').click();
	cy.isGuest();
});

// Reset database to empty
Cypress.Commands.add('clearData', () => {
	cy.task("sqlBulk", [
		"SET FOREIGN_KEY_CHECKS = 0",
		"TRUNCATE audit",
		"TRUNCATE authenticators",
		"TRUNCATE emailConfirm",
		"TRUNCATE passwords",
		"TRUNCATE userSessions",
		"TRUNCATE websites",
		"TRUNCATE users",
		"SET FOREIGN_KEY_CHECKS = 1",
	]);
});

// Add basic user to not have to register all the time again
// Ignores if the user already exists
Cypress.Commands.add('registerUser', () => {
	cy.task("sqlBulk", [
		["INSERT IGNORE INTO users (username, created, last_login) VALUES (?, NOW(), NULL)", Cypress.env("emailAddress")],
		["INSERT IGNORE INTO passwords (userId, password, created) VALUES (1, ?, NOW())", Cypress.env("basePasswordHash")],
	]);
});