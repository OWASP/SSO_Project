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
		cy.visit("/in/saml?SAMLRequest=fZLbcqowGEZfhck9iIgKGdFBBDy2KtSt3nQiRA5CQknw0Kcv1e1M977oZZIv%2Bf7MWr3BNc%2BEMy5ZQokBmpIMBEwCGiYkMsCb74gaGPR7DOVZAc2Kx2SNPyrMuFDfIwzeDwxQlQRSxBIGCcoxgzyAnrmYQ0WSYVFSTgOaAcFkDJe8LrIoYVWOSw%2BX5yTAb%2Bu5AWLOCwYbjYxGCZEYyjA70jLAUkBzIIzqyoQgfp%2FyGS0o4zkiIg5i%2Bh27bwy%2BRwLCZGSAd%2BWl7bqFQvKJbzmH4OZ6sxStWijpzK56YF5G8dDdNiNzejtbZTY9U3sVpnbksyNKo4Wed1PpIk1057MZhpt0r2ezvRUHrOCFfrqerOojuBzwC5ay6W2zKoZa4iEVXZwdS3WzXXbX9qE9LcbjrjLsHHFUjR1naWsLdGpVauzZs0x%2F13KabOeh2e7%2B2cSfF6Rtd1ei5iMWe0Vre5CX9n72Ohov%2BDXbbNEtcHfVIrIU2S2Olln%2FkrEKTwjjiHADKHKzJcqqqGi%2BokC1BVVFammdPRCWfxkME%2FIg%2BxuwwyPE4Nj3l%2BLy1fOBsHkaUgfAwwd4Ly9%2FiPD7s%2BhJH%2FSfAFEtlCyG%2BCziUMpv%2F1HvNX7U9B%2BrfyXsfwE%3D&RelayState=hello-relay");
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