Cypress.Commands.add('getEmails', () => {
	cy.request("http://localhost:8025/api/v2/messages").its("body");
});

Cypress.Commands.add('getLastEmail', () => {
	return cy.getEmails().then(emails => {
		let result = null;
		if(emails.count > 0) {
			result = emails.items[emails.count-1];
		}
		return cy.wrap(result);
    });
});

Cypress.Commands.add('getLastEmailBody', () => {
	return cy.getLastEmail().then(email => {
		const body = email.Content.Body.replace(/=\s+/g, "");
		const linkParts = body.match(/(https?:\/\/([^\/]+?)\/#(\/([^\/]+?)(?:(?:\/)([^\/]+?))?))\s*----/);
		cy.log("linkParts", linkParts);
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
	cy.getLastEmail().its("Content.Body");
});