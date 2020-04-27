describe("SSO Flow", () => {
	beforeEach(() => {
		cy.clearData();
		cy.clearLocalStorage();
	});
	
	it("Can do JWT flow", () => {
		cy.visit("/in/1");
		cy.authenticate();
		checkBranding();
		
		cy.get("#ssoFlowOutForm").should("have.attr", "action", "https://postman-echo.com/post");
		cy.get("#ssoFlowOutForm input[name=token]").invoke("val").then(value => {
			expect(value).to.have.string(".");
		});
	});
	
	it("Loads branding from SAML flow", () => {
		cy.visit("/in/saml?SAMLRequest=fZJbc6owFIX%2FCpN3EPEGGdFBRLy2KtSjvnRijFwKSUqCaH%2F9sXqc6Xnp485eyVqZb3X7lzxTzqQQCaM2qGs6UAjF7JjQyAZv4Ug1Qb%2FXFSjPOHRKGdM1%2BSyJkMrtHhXwvrBBWVDIkEgEpCgnAkoMA2cxh4amQ14wyTDLgOIIQQp5M3IZFWVOioAU5wSTt%2FXcBrGUXMBaLWNRQjWBMiJOrMBEwywHyvBmmVAk7ymfUs6EzBFVCY7Zt%2Bx%2B0P%2BOBJTJ0AbvxkvL97lB80nojg746gezFK0aKGnPLhZ2qmE88Lf1yJlez26RTc%2FMWx1TLwrFCaXRwso7qVZpE2v0VT8eN%2BneymZ7N8aCS259XD7c8hNXB%2FJCtGx63az4wEwC1ETVaCdSy2kVnbV3aE35eNwxBu0TicrxaLT0zAX6aJTNOPBmmfVu5izZzo9Oq%2FNnE39VyNzuLrSZD0Uc8Mb2oC%2B9%2Fex1OF7IS7bZoiv2d%2BUicg3d5yfXuf1SiJJMqJCIShsYer2h6k3VMEPDgM0GbBpaw2zvgbL8x2CQ0AfZ34AdHiIBx2G4VJevQQiUzbMhNwF49AHezYsfRfj9WfSkD3pPgFVVaUTFrOBqKdAdIaEykdfJsFv74dF7TP83sPcX&RelayState=hello-relay");
		cy.authenticate();
		checkBranding();
		
		cy.get("#ssoFlowOutForm").should("have.attr", "action", "https://postman-echo.com/post?saml");
		cy.get("#ssoFlowOutForm input[name=SAMLResponse]").invoke("val").then(value => {
			expect(value).to.have.string("=");
		});
		cy.get("#ssoFlowOutForm input[name=RelayState]").should("have.value", "hello-relay");
	});
});

function checkBranding() {
	cy.get("a[target='_privacy']").should("have.attr", "href", "https://www.nbcuniversal.com/privacy");
	cy.get("a[target='_imprint']").should("not.exist");
	cy.get(".brand img").should("have.attr", "src", "https://www.e-corp-usa.com/images/e-corp-logo-blue.png");
	cy.get(".footer p").should(el => expect(el.text().trim()).to.equal("E Corp"));
	cy.get("#flowLeaveButton").should("be.visible").should("contain.text", "E Corp").click();
}