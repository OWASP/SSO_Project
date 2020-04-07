const { expect } = require("chai");
const sinon = require("sinon");

const FidoClass = require("../../../utils/fido2.js").Fido2Strategy;
const Fido = new FidoClass({
	updateCounter: sinon.stub(),
	readUser: sinon.stub(),
	addAuthenticator: sinon.stub(),
	verifyUser: sinon.stub(),
	rpId: "example",
	protocol: "https",
	origin: "https://example.com",
});
const attestationStub = sinon.stub(Fido.f2l, "attestationResult");
const assertionStub = sinon.stub(Fido.f2l, "assertionResult");
Fido._readUser.resolves({
	authenticators: [{
		userHandle: "userHandle",
		userKey: "userKey",
		userCounter: "userCounter",
		userHandle: "userHandle",
	}],
});

const testAB = new Uint8Array([116, 101, 115, 116]);
const testABStr = "dGVzdA==";

describe("Fido2 (Util)", () => {
	it("initializes object", () => {
		expect(Fido.name).to.not.equal(undefined);
		expect(typeof(Fido._updateCounter)).to.equal("function");
		expect(typeof(Fido._readUser)).to.equal("function");
		expect(typeof(Fido._addAuthenticator)).to.equal("function");
		expect(typeof(Fido._verifyUser)).to.equal("function");
	});
	
	it("initializes registration", async () => {
		const regOptions = await Fido.initRegister(testAB);
		expect(regOptions.challenge).to.not.equal(undefined);
		expect(regOptions.user.id).to.not.equal(testABStr);
	});
	
	it("finishes registration", async () => {
		expect(attestationStub.called).to.equal(false);
		expect(Fido._addAuthenticator.called).to.equal(false);
		
		attestationStub.resolves({
			authnrData: new Map([
				["credId", testAB],
				["counter", "counter"],
				["credentialPublicKeyPem", "credentialPublicKeyPem"],
			]),
		});
		
		const result = await Fido.finishRegister("userId", {
			challenge: "challenge",
			response: {
				rawId: "userHandle",
			},
		}, "req");
		expect(result.counter).to.equal("counter");
		expect(result.credentialId).to.equal(testABStr);
		expect(result.publicKey).to.equal("credentialPublicKeyPem");
		
		expect(attestationStub.called).to.equal(true);
		expect(Fido._addAuthenticator.calledWith("userId")).to.equal(true);
	});
	
	it("initializes login", async () => {
		expect(Fido._readUser.called).to.equal(false);
		
		const logOptions = await Fido.initLogin("userId");
		expect(logOptions.challenge).to.not.equal(undefined);
		expect(logOptions.allowCredentials).to.be.an("array").to.have.lengthOf(1);
		expect(logOptions.allowCredentials[0].id).to.equal("userHandle");
		
		expect(Fido._readUser.calledWith("userId")).to.equal(true);
	});
	
	it("finishes login", async () => {
		Fido._readUser.resetHistory();
		expect(Fido._updateCounter.called).to.equal(false);
		
		assertionStub.resolves({
			authnrData: new Map([
				["counter", "counter"],
				["flags", "flags"],
			]),
		});
		
		const logOptions = await Fido.finishLogin("userId", {
			challenge: "challenge",
			response: {
				rawId: "userHandle",
				response: {
					authenticatorData: "authenticatorData",
				},
			},
		});
		expect(logOptions.user.authenticators.length).to.equal(1);
		expect(logOptions.authenticator.userHandle).to.equal("userHandle");
		
		expect(Fido._readUser.calledWith("userId")).to.equal(true);
		expect(Fido._updateCounter.calledWith("userHandle", "counter")).to.equal(true);
	});
	
	it("converts strings to arraybuffer", () => {
		const result = Fido.str2ab("test");

		expect(result.constructor).to.equal(Uint8Array);
		expect(Array.from(result)).to.deep.equal([116, 101, 115, 116]);
	});
});