const { expect } = require("chai");
const sinon = require("sinon");

const { res, pages, fido2Options, stubs } = require("../_shared.js");
const { Audit, User, JWT } = require("../../../utils");
const samlp = require("samlp");
// We can't mock MiddlewareHelper, but can catch the result using "res"

const samlParseStub = sinon.stub(samlp, "parseRequest").callsArgWith(1, null, {
	destination: "destination", // class overrides for localhost automatically
});

const SSOFlowClass = require("../../../flows/sso-flow.js").ssoFlow;
const SSOFlow = new SSOFlowClass(pages, fido2Options, "serverCrt", "serverKey");

describe("SSO-Flow (Flow)", () => {
	it("initializes correctly", () => {
		expect(SSOFlow.ownJwtToken).to.equal("key");
		expect(SSOFlow.hostname).to.equal("localhost");
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
				SAMLRequest: "SAMLRequest",
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