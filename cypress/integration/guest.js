describe("Guest Activity", () => {
	beforeEach(() => {
		cy.clearData();
		cy.clearLocalStorage();
	});
	
	it("Registers a new account", () => {
		cy.visit("/");
		cy.get("#goRegister").click();

		cy.get("#email").type(Cypress.env("emailAddress"));
		cy.get("#agree").check({force: true});
		cy.get("#termsLink").should("have.attr", "href", "https://owasp.org/www-policy/operational/general-disclaimer");
		cy.get("button[type=submit]").click();
		cy.get(".alert-success").should("be.visible");

		cy.get("#goLogin").click();
		
		cy.getLastEmailBody().then(email => {
			expect(email.link.endpoint).to.equal("register");
			cy.visit(email.link.path);
			
			cy.get("#password").type(Cypress.env("basePassword"));
			cy.get("#confirm").type(Cypress.env("basePassword"));
			cy.get("button[type=submit]").click();
		
			cy.isAuthenticated();
		});
	});
	
	it("Can reset/change password", () => {
		cy.registerUser();
		
		cy.visit("/");
		cy.get("#goReset").click();
		cy.get("#email").type(Cypress.env("emailAddress"));
		cy.get("button[type=submit]").click();
		
		cy.get(".alert-success").should("be.visible");
		
		cy.getLastEmailBody().then(email => {
			expect(email.link.endpoint).to.equal("change-password");
			cy.visit(email.link.path);
			
			const altPass = Cypress.env("basePassword") + "4";
			cy.get("#password").type(altPass);
			cy.get("#confirm").type(altPass);
			cy.get("button[type=submit]").click();
			
			cy.isAuthenticated();
		});
	});
	
	it("Shows information page", () => {
		cy.visit("/");
		
		cy.get("[href='#/about']").click();
		cy.get("#title-security").click();
		
		cy.get(".about-banner").should("be.visible");
		
		cy.get(".brand img").click();
		cy.isGuest();
	});
	
	it("Loads default page", () => {
		cy.visit("/");
		
		cy.get("a[target='_privacy']").should("have.attr", "href", "https://owasp.org/www-policy/operational/privacy");
		cy.get("a[target='_imprint']").should("have.attr", "href", "https://owasp.org/contact/");
		cy.get(".brand img").should("have.attr", "src", "https://owasp.org/assets/images/logo.png");
		cy.get(".footer p").should(el => expect(el.text().trim()).to.equal("OWASP Foundation"));
		cy.get(".footer").should("have.css", "color");
		cy.get("body").should("have.css", "background-color");
	});
});