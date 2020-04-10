// Get all emails
Cypress.Commands.add('getEmails', () => {
	cy.request("http://localhost:8025/api/v2/messages").its("body");
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

// Check if user is logged in and then logs out again
Cypress.Commands.add('endLoggedIn', () => {
	cy.url().should('include', '/audit');
	cy.get('.mt-4 > .btn-warning').click();
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
Cypress.Commands.add('registerUser', () => {
	cy.task("sqlBulk", [
		["INSERT INTO users (username, created, last_login) VALUES (?, NOW(), NULL)", Cypress.env("emailAddress")],
		["INSERT INTO passwords (userId, password, created) VALUES (1, ?, NOW())", Cypress.env("basePasswordHash")],
	]);
});