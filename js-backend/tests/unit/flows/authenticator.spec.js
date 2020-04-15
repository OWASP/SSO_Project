const { expect } = require("chai");
const sinon = require("sinon");

const { fido2Options, res, stubs } = require("../_shared.js");
const { User } = require("../../../utils");

const testAB = new Uint8Array([116, 101, 115, 116]);
const testABStr = "dGVzdA==";
const userFindResponse = {
	authenticators: [{
		userHandle: testABStr,
		userKey: "userKey",
		userCounter: "userCounter",
		type: "fido2",
	}],
};

const AuthenticatorClass = require("../../../flows/authenticator.js").authenticatorFlow;
const Authenticator = new AuthenticatorClass(fido2Options);

describe("Authenticator (Flow)", () => {
	it("initializes correctly", () => {
		expect(Authenticator.f2l).to.be.a("object");
		expect(Authenticator.ownJwtToken).to.equal("key");
	});
	
	it("deletes authenticator", done => {
		const userDeleteAuthStub = sinon.stub(User, "removeAuthenticator").resolves();
		stubs.auditAddStub.resetHistory();
		
		Authenticator.onAuthenticatorDelete({
			body: {
				handle: "handle",
				type: "fido2",
			},
			user: {
				id: 1,
			},
		}, null, () => {
			expect(stubs.auditAddStub.called).to.equal(true);
			expect(userDeleteAuthStub.called).to.equal(true);
			
			done();
		});
	});
	
	it("prepares fido registration", done => {
		stubs.jwtSignStub.resetHistory();
		
		res.json = data => {
			expect(stubs.jwtSignStub.called).to.equal(true);
			
			expect(data.token).to.be.a("string");
			expect(data.options.user.id).to.be.a("string");
			
			done();
		};
		
		Authenticator.onFidoRegisterGet({
			user: {
				id: 1,
			},
		}, res, null);
	});
	
	it("finishes fido registration", done => {
		const attestationStub = sinon.stub(Authenticator.f2l, "attestationResult").resolves({
			authnrData: new Map([
				["credId", testAB],
				["counter", "counter"],
				["credentialPublicKeyPem", "credentialPublicKeyPem"],
			]),
		});
		
		stubs.jwtVerifyStub.resetHistory().resolves({
			challenge: "challenge",
			response: {
				rawId: testABStr,
			},
		});
		stubs.auditAddStub.resetHistory();
		stubs.addAuthStub.resetHistory();
		
		Authenticator.onFidoRegisterPost({
			user: {
				id: 1,
			},
			body: {
				response: {
					rawId: testABStr,
				},
				label: "label",
				token: "token",
			},
		}, res, () => {
			expect(stubs.jwtVerifyStub.calledWith("token")).to.equal(true);
			expect(attestationStub.called).to.equal(true);
			expect(stubs.auditAddStub.called).to.equal(true);
			expect(stubs.addAuthStub.called).to.equal(true);
			
			done();
		});
	});
	
	it("prepares fido login", done => {
		stubs.userFindStub.resetHistory().resolves(userFindResponse);
		
		res.json = data => {
			expect(stubs.userFindStub.calledWith(1)).to.equal(true);
			expect(data.token).to.be.a("string");
			expect(data.options.allowCredentials).to.be.an("array").to.have.lengthOf(1);
			expect(data.options.allowCredentials[0].id).to.equal(testABStr);
			
			done();
		};
		
		Authenticator.onFidoLoginGet({
			user: {
				id: 1,
			},
		}, res, null);
	});
	
	it("finishes fido login", done => {
		const assertionStub = sinon.stub(Authenticator.f2l, "assertionResult").resolves({
			authnrData: new Map([
				["counter", "counter"],
				["flags", "flags"],
			]),
		});
		
		stubs.userFindStub.resetHistory().resolves(userFindResponse);
		stubs.auditAddStub.resetHistory();
		
		stubs.jwtVerifyStub.resetHistory().resolves({
			challenge: "challenge",
			response: {
				rawId: testABStr,
			},
		});
		
		const updateCounterStub = sinon.stub(User, "updateAuthenticatorCounter").resolves();
		
		Authenticator.onFidoLoginPost({
			user: {
				id: 1,
			},
			body: {
				response: {
					rawId: testABStr,
					response: {
						authenticatorData: "authenticatorData",
					},
				},
			},
		}, null, () => {
			expect(stubs.jwtVerifyStub.called).to.equal(true);
			expect(stubs.userFindStub.calledWith(1)).to.equal(true);
			expect(assertionStub.called).to.equal(true);
			expect(stubs.auditAddStub.called).to.equal(true);
			expect(updateCounterStub.called).to.equal(true);
			
			done();
		});
	});
	
	it("converts strings to arraybuffer", () => {
		const result = Authenticator.str2ab("test");

		expect(result.constructor).to.equal(Uint8Array);
		expect(Array.from(result)).to.deep.equal([116, 101, 115, 116]);
	});
	
	it("checks label", done => {
		res.status.resetHistory();
		Authenticator.checkLabel({
			body: {
				label: "asdf <",
			},
		}, res, () => {
			expect.fail("Let invalid label pass");
		});
		expect(res.status.calledWith(400)).to.equal(true);
		
		res.status.resetHistory();
		Authenticator.checkLabel({
			body: {
				label: "asdf '",
			},
		}, res, () => {
			expect.fail("Let invalid label pass");
		});
		expect(res.status.calledWith(400)).to.equal(true);
		
		res.status.resetHistory();
		Authenticator.checkLabel({
			body: {
				label: "asdf \"",
			},
		}, res, () => {
			expect.fail("Let invalid label pass");
		});
		expect(res.status.calledWith(400)).to.equal(true);
		
		res.status.resetHistory();
		Authenticator.checkLabel({
			body: {
				label: "asdf - asd",
			},
		}, res, () => {
			expect(res.status.called).to.equal(false);
			
			done();
		});
	});
});