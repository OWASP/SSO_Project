const { expect } = require("chai");
const sinon = require("sinon");

const { res, pages, stubs } = require("../_shared.js");
const { User, PwUtil } = require("../../../utils");
const pki = require("node-forge").pki;
const child_process = require("child_process");
const path = require("path");

const pkiVerifyStub = sinon.stub(pki, "verifyCertificateChain").returns(true);
const samplePageHook = pages["1"].certificates[0].webhook;
const httpPostStub = sinon.stub(PwUtil, "httpPost").resolves(samplePageHook.successContains);

const AuthCertClass = require("../../../flows/authenticator-cert.js").authenticatorCertFlow;
const AuthCert = new AuthCertClass(pages, {});

const certEncoded = "-----BEGIN%20CERTIFICATE-----%0AMIIGTzCCBDegAwIBAgIUJpEyBkm0fJJ%2B7i85bpm%2FUU1ZP4EwDQYJKoZIhvcNAQEL%0ABQAwgbYxHTAbBgNVBAMMFE9XQVNQIFNpbmdsZSBTaWduLU9uMRkwFwYDVQQKDBBP%0AV0FTUCBFdXJvcGUgVlpXMRQwEgYDVQQLDAtTU09fUHJvamVjdDEzMDEGCSqGSIb3%0ADQEJARYkSmFtZXNDdWxsdW1AdXNlcnMubm9yZXBseS5naXRodWIuY29tMQ8wDQYD%0AVQQHDAZCLTk2NjAxETAPBgNVBAgMCE9wYnJha2VsMQswCQYDVQQGEwJCRTAeFw0y%0AMDAzMjExMzM2MTBaFw0yNTAzMjAxMzM2MTBaMIG2MR0wGwYDVQQDDBRPV0FTUCBT%0AaW5nbGUgU2lnbi1PbjEZMBcGA1UECgwQT1dBU1AgRXVyb3BlIFZaVzEUMBIGA1UE%0ACwwLU1NPX1Byb2plY3QxMzAxBgkqhkiG9w0BCQEWJEphbWVzQ3VsbHVtQHVzZXJz%0ALm5vcmVwbHkuZ2l0aHViLmNvbTEPMA0GA1UEBwwGQi05NjYwMREwDwYDVQQIDAhP%0AcGJyYWtlbDELMAkGA1UEBhMCQkUwggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAwggIK%0AAoICAQDhyu6Rcmd6jez5UDdn0dxpq%2BbsCwsmycqpjzE3qJSF%2BNji8oE5TXYNNEbQ%0Amg%2BcDyYUCL76VAJnxqnN2%2F%2FdsqKpj1bXTtqJqe5NyLAfAz45qIqCDbd4OQCPfFPl%0ATFI%2Fq%2FzYf6ge93BqFGq4JLt43TMTeqUnvGrfckaBpSA0R3GaXpwCwvryGEx%2FiwLz%0AEVSUDRFloxcNbmWTGxgqyqnEM%2BPtp0FL%2F6hPHm6E%2Bt7GKtuKA%2Bz68ud16RunqCRz%0AoVfRr4flrm0iB6gIe1NiUjsmJuFTZM7gH%2Bo8oo59zIeLltIvlpDUmpdHkPGxEn4n%0AoRlgiwnuRDl6qdl0SoAxHjLfnjhdmgXW6fH%2Fc6gtciQ3s%2BQAKidw%2FdfpC1xSQIdp%0AByOL%2FOHpTzkkWD9Q8I4lxo0Rf9GdRvB9oOPA121fWKPHMzDGHQk3JTNN5Aj%2Bu27s%0AQW5GS8J0LnIFclpgx3yeCVAmoSViGMn15jyr%2F0M%2BwHaXGNwA5GfnHlJTI%2BG4CBaq%0Ay2bdoM6y%2Fvo9PRRQpaNVvvz%2FSlch8zeQBVRAHnwdKXXehWC%2FzkP3QOctxtMkbTJ4%0AfLPopCS%2BEGAa2kbForycnUDMWxwv2R%2Fomg0ZmhaD483aGMuzmiaDsFf8mNxD1%2BOr%0AeQD05ZkzH7Gvi1%2Bz8EIVNdzCJoO7rjVY42KVWBBo2eykRoYl0QIDAQABo1MwUTAd%0ABgNVHQ4EFgQU%2FHz%2Fm30%2BtORkRfoBujT%2BeuGrdX8wHwYDVR0jBBgwFoAU%2FHz%2Fm30%2B%0AtORkRfoBujT%2BeuGrdX8wDwYDVR0TAQH%2FBAUwAwEB%2FzANBgkqhkiG9w0BAQsFAAOC%0AAgEAcMIKlI0hnnxnGSYgbZ3Xc88H3S3jxWCuCQOnnQvl9kPvYxe3CDgGM8x7e%2BGO%0AodWtjmhoKtbGNidyfbCCvNJ0R6OLKYLqDQTdq%2FKMy2jPLzzNQo7ZZ44iHt3KbpMc%0Aq7A9LqSlof%2FMGGwOWdNIF4ihIn7tl00mheD5YDcWfLQicIg%2BVCQy672dH1Bkoj7F%0A0Pqob08No7LTgMCFkF9wYSQPxv5pWxst264nwc6JI8YHA0kReM0yIVr7hvLWz2AG%0AERdbcEhuRrJUoEL%2FceyNsCm82vt9otMIK%2FUFLyKvMUsT7yqMnAaZ8lH9WjGSAblN%0AxBq%2BRkV8Tdor2s4yhBOnXlYaQiV8DyjKjH1l3TR3of2sAvFeJA0mSbWERC50qTPW%0Ah5YCBFKL5QiZyD7ar%2Bc7JImCJmO2M5Hb9opYYnq%2BwBVNOrj2%2F0fmq2DA9ZTs7guJ%0AvJFTcI7HtP%2BK9D%2FFkrcWYRaISliTk%2BGaNCGEAUzy6uTBxTvsDgV%2BoXWyIX1UEhnQ%0AnyxVMMViFvHChTgmY4EYHzF8SH4Y%2BPI2cTYw3B%2FiE9pdEyiJeqBhcpoTRYxKf3tT%0AYu0hBe4PauRj0qkUNxlGFU1W0E7bcG1UBiPADMQ6wLSGcuS8THC7P6vtxwqJuQNo%0A1LKTW4Y6htyviJ0tBgU6qnliDABsYd3qXD5t9uIha%2F730to%3D%0A-----END%20CERTIFICATE-----%0A";
const certReq = {
	connection: {
		getPeerCertificate: () => {
			return {};
		},
	},
	headers: {
		"x-tls-verified": "SUCCESS",
		"x-tls-cert": certEncoded,
	},
	body: {},
	user: {
		id: 1,
		username: "JamesCullum@users.noreply.github.com",
	},
};
const certDecoded = AuthCert.getCert(certReq);
const originalCert = {
	raw: certDecoded.cert.raw,
	valid_from: "valid_from",
	valid_to: "valid_to",
	fingerprint256: "fingerprint256",
	subject: {
		emailAddress: "emailAddress",
		CN: "CN",
	},
};

describe("Authenticator-Cert (Flow)", () => {
	it("initializes correctly", () => {
		expect(AuthCert.customPages).to.equal(pages);
		expect(AuthCert.ownJwtToken).to.equal("key");
	});
	
	it("gets the certificate directly", () => {
		const req = {
			connection: {
				getPeerCertificate: () => {
					return originalCert;
				},
			},
		};
		const directCert = AuthCert.getCert(req);
		expect(directCert.cert).to.deep.equal(originalCert);
		expect(directCert.forgeCert).to.be.a("object");
		expect(req.certificate).to.deep.equal(originalCert);
		expect(req.forgeCert).to.be.a("object");
	});
	
	it("gets the certificate via header", () => {
		expect(certDecoded.cert.fingerprint256).to.equal("79:A0:CD:A1:7E:45:B1:FE:52:73:52:8A:F5:05:AF:5E:00:06:57:6C:7C:85:C6:6C:A4:11:08:8D:F5:A7:E5:38");
		expect(certDecoded.cert.subject.emailAddress).to.equal("JamesCullum@users.noreply.github.com");
		expect(certDecoded.cert.subject.CN).to.equal("OWASP Single Sign-On");
		expect(certDecoded.forgeCert).to.be.a("object");
	});
	
	it("logins custom CA", done => {
		stubs.auditAddStub.resetHistory();
		pkiVerifyStub.resetHistory();
		httpPostStub.resetHistory();
		
		stubs.jwtVerifyStub.resetHistory().resolves({
			pageId: 1,
		});
		
		AuthCert.checkCustomCa({
			body: {
				token: "token",
			},
			user: {
				username: "username",
			},
			cetificate: certDecoded.cert,
			forgeCert: certDecoded.forgeCert,
		}, res, () => {
			expect(stubs.jwtVerifyStub.calledWith("token")).to.equal(true);
			expect(pkiVerifyStub.called).to.equal(true);
			expect(httpPostStub.calledWith(samplePageHook.url)).to.equal(true);
			expect(stubs.auditAddStub.called).to.equal(true);
			
			done();
		});
	});
	
	it("logins native CA", done => {
		stubs.auditAddStub.resetHistory();
		pkiVerifyStub.resetHistory();
		res.status.resetHistory();
		
		const getAuthStub = sinon.stub(User, "findAuthenticatorByUser").resolves([{
			type: "cert",
			userHandle: "79:A0:CD:A1:7E:45:B1:FE:52:73:52:8A:F5:05:AF:5E:00:06:57:6C:7C:85:C6:6C:A4:11:08:8D:F5:A7:E5:38",
			label: "label",
		}]);

		certReq.user.username = "elliot.alderson@e-corp-usa.com";
		AuthCert.onCertLogin(certReq, res, () => {
			expect.fail("Passed wrong email");
		});
		expect(res.status.calledWith(403)).to.equal(true);
		
		certReq.user.username = "JamesCullum@users.noreply.github.com";
		AuthCert.onCertLogin(certReq, res, () => {
			console.log("onCertLogin");
			expect(getAuthStub.calledWith(1)).to.equal(true);
			expect(pkiVerifyStub.called).to.equal(true);
			expect(stubs.auditAddStub.called).to.equal(true);
			
			done();
		});
	});
	
	it("creates a certificate", done => {
		res.status.resetHistory();
		stubs.auditAddStub.resetHistory();
		
		const execStub = sinon.stub(child_process, "execFile").callsArgWith(3, null, JSON.stringify({
			file: path.resolve("./tmp/test.tmp"),
			fingerprint256: "fingerprint256",
		}), null);
		
		res.download = () => {
			expect.fail("Invalid username passed");
		};
		
		const reqReg = {
			user: {
				username: "username'",
			},
			body: {
				label: "label",
			},
		};
		// Invalid email
		AuthCert.onCertRegister(reqReg, res, null);
		expect(res.status.calledWith(500)).to.equal(true);
		
		res.download = (certPath, filename, cb) => {
			expect(stubs.auditAddStub.called).to.equal(true);
			expect(filename).to.equal("client-certificate.p12");
			expect(stubs.addAuthStub.called).to.equal(false);
			expect(execStub.called).to.equal(true);
			
			cb();
			expect(stubs.addAuthStub.calledWith("cert")).to.equal(true);
			
			done();
		};
		
		// Correct one
		reqReg.user.username = "username";
		AuthCert.onCertRegister(reqReg, res, null);
	});
});