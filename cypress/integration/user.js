describe("User Activity", () => {
	beforeEach(() => {
		cy.clearData();
		cy.authenticate();
	});
	
	it("Can log out", () => {
		cy.logout();
	});
	
	it("Can load more audit logs", () => {
		const insertValues = [];
		for(let i=0;i<10;i++) {
			insertValues.push("('8.8.8.8', 'US', 'login', 'password', 1)");
		}
		cy.task("sql", "INSERT INTO audit (ip, country, object, action, user) VALUES "+(insertValues.join(",\n"))+";");
		
		cy.get(".data-logs").find(".accordion-row").should("have.length", 5);
		cy.get("#loadMoreAudit").click();
		cy.get(".data-logs").find(".accordion-row").should("have.length", 10);
		
		cy.get(".data-logs .accordion-row:last").click();
		cy.get(".audit-logs").scrollTo("bottom");
		cy.get(".data-logs .accordion-row:last .collapse.show .card-body").should("be.visible");
		cy.get(".flag.flag-us").should("be.visible");
	});
	
	it("Can log out other sessions", () => {
		cy.task("sql", "INSERT INTO userSessions (userId, token) VALUES (1, 'other-token')");
		cy.task("sql", "SELECT * FROM userSessions WHERE userId = 1").should("have.length", 2);
		
		// Also check if the audit log reloads on an activity
		cy.get(".data-logs").find(".accordion-row").then(beforeRows => {
			const beforeNum = beforeRows.length;
			
			cy.get("#closeSessions").click();
			
			cy.wait(2000);
			cy.get(".data-logs").find(".accordion-row").then(afterRows => {
				const afterNum = afterRows.length;
				
				expect(afterNum).to.equal(beforeNum+1);
				
				cy.task("sql", "SELECT * FROM userSessions WHERE userId = 1").should("have.length", 1);
			});
		});
	});
});