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
		
		cy.get(".data-logs .accordion-row").should("have.length", 5);
		cy.get("#loadMoreAudit").click();
		cy.get(".data-logs .accordion-row").should("have.length", 10);
		
		cy.get(".data-logs .accordion-row:last").click();
		cy.get(".audit-logs").scrollTo("bottom");
		cy.get(".data-logs .accordion-row:last .collapse.show .card-body").should("be.visible");
		cy.get(".flag.flag-us").should("be.visible");
	});
	
	it("can report suspicious events", () => {
		cy.expectLogIncrease(0);

		cy.get(".data-logs .accordion-row:first").click();
		cy.get(".data-logs .accordion-row:first .report-log").click();
		
		cy.expectLogIncrease(2);
	});
	
	it("Can log out other sessions", () => {
		cy.task("sql", "INSERT INTO userSessions (userId, token) VALUES (1, 'other-token')");
		cy.task("sql", "SELECT * FROM userSessions WHERE userId = 1").should("have.length", 2);
		
		cy.expectLogIncrease(0);
		cy.get("#closeSessions").click();
		
		cy.expectLogIncrease(1);
		cy.task("sql", "SELECT * FROM userSessions WHERE userId = 1").should("have.length", 1);
	});
});

function expectLogs(num) {
	cy.get(".data-logs").find(".accordion-row").should("have.length", num);
}