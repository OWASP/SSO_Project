describe("Authenticator Activity", () => {
	beforeEach(() => {
		cy.clearData();
		cy.task("resetCRI", {});
	});
	
	it("Can add and remove an authenticator", () => {
		// Counting is time sensitive and doesn't wait automatically, so we need to wait sometimes
		cy.authenticate();
		expectAuthenticators(0);
		cy.get(".data-logs").find(".accordion-row").then(beforeRows => {
			const beforeNum = beforeRows.length;
			
			addCertificate();
			
			cy.wait(3000);
			expectAuthenticators(1);
			cy.get(".data-logs").find(".accordion-row").should("have.length", beforeNum+1);
			
			cy.get(".remove-authenticator").click();
			cy.wait(1000);
			expectAuthenticators(0);
			cy.get(".data-logs").find(".accordion-row").should("have.length", beforeNum+2);
		});
	});
	
	it("Adds FIDO2 authenticator and can log in with it", () => {
		// Set up virtual authenticator
		cy.task("sendCRI", {
			query: "WebAuthn.enable",
			opts: {},
		}).then(() => {
			cy.task("sendCRI", {
				query: "WebAuthn.addVirtualAuthenticator",
				opts: {
					options: {
						protocol: "ctap2",
						transport: "usb",
						hasResidentKey: true,
						hasUserVerification: true,
						isUserVerified: true,
					},
				},
			}).then(addResult => {
				const credId = addResult.authenticatorId;
				expect(credId).to.have.string("-").to.have.lengthOf(36);
				//cy.log(["addResult", addResult, credId]);
				
				// Everything ready, now create a token
				cy.authenticate();
				expectAuthenticators(0);
				
				cy.get("#add-authenticator-group select").select("fido");
				cy.get("#add-authenticator-group input[type=text]").type("Test - Fido");
				cy.get("#add-authenticator-group button[type=submit]").click();
				
				cy.wait(3000);
				expectAuthenticators(1);
				
				cy.task("sendCRI", {
					query: "WebAuthn.getCredentials",
					opts: addResult,
				}).then(getCreds => {
					expect(getCreds.credentials.length).to.equal(1);
					
					// Check if audit log contains added authenticator
					const credHandle = getCreds.credentials[0].credentialId;
					cy.get(".data-logs").contains("Test - Fido").contains(credHandle);
					
					// Now try to log in with this authenticator
					cy.logout();
					cy.login();
					
					cy.get("#confirmFido").click();
					cy.isAuthenticated();
				});
			});
		});
	});
	
	it("Adds certificate and can log in with it", () => {
		cy.authenticate();
		addCertificate();
		
		// See https://github.com/cypress-io/cypress/issues/949#issuecomment-400252677
		cy.get("#download-cert-tmp").then(anchor => {
			expect(anchor.attr("download")).to.equal(Cypress.env("emailAddress")+".p12");
			
			// Artificial download
			return new Cypress.Promise((resolve, reject) => {
				const xhr = new XMLHttpRequest();
				xhr.open("GET", anchor.prop("href"), true);
				xhr.responseType = "blob";
				
				xhr.onload = () => {
					const blob = xhr.response;
					const reader = new FileReader();
					reader.onload = () => {
						resolve(reader.result.split(",")[1]);
					};
					reader.readAsDataURL(blob);
				};
				xhr.send();
			}).then(p12Blob => {
				// Parse file to get certificate data
				cy.task("parseP12", p12Blob).then(certData => {
					// Check if certificate is valid
					expect(certData.meta.certificate.CN).to.equal(Cypress.env("emailAddress"));
					expect(certData.meta.certificate.emailAddress).to.equal(Cypress.env("emailAddress"));
					expect(certData.meta.issuer.CN).to.equal("OWASP SSO");
					expect(certData.id).to.have.string(":");
					expect(certData.certificate).to.have.string("-----BEGIN CERTIFICATE-----");
					
					// Now log out and go back to 2fa screen
					cy.logout();
					cy.login();
					
					// Just get element to wait on finish loading and make context ready to get localStorage
					cy.get("#confirmEmail").then(() => {
						// We can not just use the certificate in the browser due to headless test limitations, so we send it via bridge
						const userData = JSON.parse(localStorage.getItem(Cypress.env("emailAddress")));
						const loginUrl = "https://"+Cypress.env("FRONTENDHOST")+"/api/cert/login";
						
						cy.request("POST", loginUrl, {
							authorizationToken: userData.token,
							certificate: encodeURIComponent(certData.certificate),
						}).then(checkLogin => {
							// Extract the token from the response and set it manually
							const extractJson = checkLogin.body.match(/JSON\.parse\('([\s\S]+?)'\)/);
							const parsedJson = JSON.parse(extractJson[1]);
							
							userData.token = parsedJson.token;
							localStorage.setItem(Cypress.env("emailAddress"), JSON.stringify(userData));
							
							cy.reload(true); // Page will redirect to /audit if the token is valid
							cy.isAuthenticated();
						});
					});
				});
			});
		});
	});
});

function addCertificate() {
	cy.get("#add-authenticator-group select").select("cert");
	cy.get("#add-authenticator-group input[type=text]").type("Test - Cert");
	cy.get("#add-authenticator-group button[type=submit]").click();
}

function expectAuthenticators(num) {
	cy.get("#authenticatorManage").find(".list-group-item").should("have.length", num);
}