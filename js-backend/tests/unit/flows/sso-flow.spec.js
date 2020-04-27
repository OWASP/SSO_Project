const { expect } = require("chai");
const sinon = require("sinon");

const { res, pages, fido2Options, stubs } = require("../_shared.js");
const { Audit, User, JWT } = require("../../../utils");
const samlp = require("samlp");
// We can't mock MiddlewareHelper, but can catch the result using "res"

const samlParseStub = sinon.stub(samlp, "parseRequest").callsArgWith(1, null, {
	assertionConsumerServiceURL: "https://postman-echo.com/post?saml",
});

const SSOFlowClass = require("../../../flows/sso-flow.js").ssoFlow;
const SSOFlow = new SSOFlowClass(pages, fido2Options, "serverCrt", "serverKey");

describe("SSO-Flow (Flow)", () => {
	it("initializes correctly", () => {
		expect(SSOFlow.ownJwtToken).to.equal("key");
		expect(SSOFlow.serverCrt).to.equal("serverCrt");
	});
	
	it("allows an unauthenticated incoming JWT flow", done => {
		stubs.jwtSignStub.resetHistory();

		res.json = data => {
			expect(stubs.jwtSignStub.called).to.equal(true);
			expect(data.page.token).to.equal("jwt");
			expect(data.page.flowType).to.equal("jwt");

			done();
		};
		
		SSOFlow.onFlowIn({
			query: {
				id: 1,
			},
			body: {},
		}, res, null);
	});
	
	it("allow an authenticated incoming JWT flow", done => {
		stubs.auditAddStub.resetHistory();
		stubs.findUserStub.resetHistory().resolves({
			id: 1,
		});
		
		const sampleMail = "username@example.com";
		stubs.jwtVerifyStub.resetHistory().resolves({
			sub: sampleMail,
		});
		
		const req = {
			query: {
				id: 1,
				d: "jwt",
			},
			body: {},
		};
		
		res.json = data => {
			expect(req.user.id).to.equal(1);
			expect(req.loginEmail).to.equal(sampleMail);
			
			expect(stubs.auditAddStub.called).to.equal(true);
			expect(stubs.jwtSignStub.called).to.equal(true);
			expect(data.token).to.be.a("string");
			expect(data.username).to.equal(sampleMail);
			expect(data.factor).to.equal(1);
			expect(data.page.token).to.equal("jwt");
			expect(data.page.flowType).to.equal("jwt");
			
			done();
		};
		
		SSOFlow.onFlowIn(req, res, null);
	});
	
	it("allows authenticated outgoing JWT flow", done => {
		stubs.auditAddStub.resetHistory();
		stubs.jwtSignStub.resetHistory();
		
		const req = {
			ssoRequest: {
				pageId: 1,
				sub: "other-username",
				jwt: true,
			},
			user: {
				id: 1,
				username: "username",
			},
		};
		
		// Check rejection
		res.status.resetHistory();
		res.json = data => {
			expect.fail("Accepted wrong user");
		};
		SSOFlow.onFlowOut(req, res, null);
		expect(res.status.calledWith(403)).to.equal(true);
		
		// Check correct one
		req.ssoRequest.sub = "username";
		res.json = data => {
			expect(data.token).to.equal("jwt");
			expect(data.redirect).to.be.a("string");
			expect(stubs.auditAddStub.called).to.equal(true);
			expect(stubs.jwtSignStub.called).to.equal(true);
			
			done();
		};
		
		SSOFlow.onFlowOut(req, res, null);
	});
	
	it("allows outgoing SAML flow", done => {
		samlParseStub.resetHistory();
		stubs.jwtSignStub.resetHistory();
		
		res.json = data => {
			expect(data.page.token).to.equal("jwt");
			expect(data.page.flowType).to.equal("saml");
			expect(samlParseStub.called).to.equal(true);
			expect(stubs.jwtSignStub.called).to.equal(true);
			
			done();
		};
		
		SSOFlow.onSamlIn({
			query: {
				SAMLRequest: "fZJZc6owGIb%2FCpN7EMEFMqKDuC8VhVr1xokhsggJJcGlv75WjzM9N71M8n55knmfVueapdKZFDxm1AJVRQUSoZgFMQ0t8O4PZAN02i2OsjSHdikiuiKfJeFCus9RDh8HFigLChniMYcUZYRDgaFnz2dQU1SYF0wwzFIg2ZyTQtxBDqO8zEjhkeIcY%2FK%2BmlkgEiLnsFLJGRcZojLBEVMwyx4bnR8OkHp3cEyReLz1NRDGIioPj%2Bjiw%2Fbciuct9m7BEoIFkMY9C%2By1t%2FpwmGs0G%2FvO4IBvQ2%2BaoKWO4sb0amL70ou6w001tCe3s1OkkzPrL4OkH%2Fr8iJJwbmbNRLkoY3PwVQ2CdbIz0%2BnOiTDPRW6erien%2FMSXA3kjSjq5rZd514g9VEOXwZYnpl0vmqv%2BoT7JR6Om1m0cSViOBgO3b8zRSS9rkdefpubeyFi8mQV2vfmxjr4uyNhsr7SW9Xjk5frmoLr93XTRG83FNV1v0A0Pt%2BU8dDR1mB8d%2B%2F5LzksyplwgKiygqVVdVmuyZviaBms6rGmKbjR2QHL%2FddGN6bPhv4o7PEMcjnzfld2F5wNp%2FTLlHgBPL%2BADXvwS4u9r0csC0H5ViO5iqXJAzjIJlOymcJQSfmQFJj%2B1tiq%2FMO3n6n8Z298%3D",
				RelayState: "RelayState",
			},
		}, res, null);
	});
	
	it("shows saml meta", done => {
		samlp.metadata = data => {
			expect(data.issuer).to.equal(fido2Options.rpName);
			expect(data.cert).to.equal("serverCrt");
			
			done();
		};
		
		SSOFlow.onSamlMeta(null, null, null);
	});
});