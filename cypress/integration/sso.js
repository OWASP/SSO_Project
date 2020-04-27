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
		cy.visit("/in/saml?SAMLRequest=fZJZc6owGIb%2FCpN7EMEFMqKDuC8VhVr1xokhsggJJcGlv75WjzM9N71M8n55knmfVueapdKZFDxm1AJVRQUSoZgFMQ0t8O4PZAN02i2OsjSHdikiuiKfJeFCus9RDh8HFigLChniMYcUZYRDgaFnz2dQU1SYF0wwzFIg2ZyTQtxBDqO8zEjhkeIcY%2FK%2BmlkgEiLnsFLJGRcZojLBEVMwyx4bnR8OkHp3cEyReLz1NRDGIioPj%2Bjiw%2Fbciuct9m7BEoIFkMY9C%2By1t%2FpwmGs0G%2FvO4IBvQ2%2BaoKWO4sb0amL70ou6w001tCe3s1OkkzPrL4OkH%2Fr8iJJwbmbNRLkoY3PwVQ2CdbIz0%2BnOiTDPRW6erien%2FMSXA3kjSjq5rZd514g9VEOXwZYnpl0vmqv%2BoT7JR6Om1m0cSViOBgO3b8zRSS9rkdefpubeyFi8mQV2vfmxjr4uyNhsr7SW9Xjk5frmoLr93XTRG83FNV1v0A0Pt%2BU8dDR1mB8d%2B%2F5LzksyplwgKiygqVVdVmuyZviaBms6rGmKbjR2QHL%2FddGN6bPhv4o7PEMcjnzfld2F5wNp%2FTLlHgBPL%2BADXvwS4u9r0csC0H5ViO5iqXJAzjIJlOymcJQSfmQFJj%2B1tiq%2FMO3n6n8Z298%3D&RelayState=hello-relay");
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