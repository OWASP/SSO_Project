const { expect } = require("chai");
const sinon = require("sinon");

const { res, stubs } = require("../_shared.js");
const { User, PwUtil } = require("../../../utils");

const LocalAuthClass = require("../../../flows/local-auth.js").localAuthFlow;
const LocalAuth = new LocalAuthClass();

describe("Local-Auth (Flow)", () => {
	it("initializes correctly", () => {
		expect(LocalAuth.hostname).to.equal("localhost");
	});
	
	it("allows login with username and password", done => {
		stubs.auditAddStub.resetHistory();
		stubs.findUserStub.resetHistory().resolves({
			id: 1,
			password: "password",
		});
		const verifyStub = sinon.stub(PwUtil, "verifyPassword").resolves(true);
		const updateStub = sinon.stub(User, "updateLoginTime").resolves(true);
		
		const req = {
			body: {
				username: "username",
				password: "password",
			},
		};
		
		LocalAuth.onLocalLogin(req, res, () => {
			expect(stubs.findUserStub.calledWith("username")).to.equal(true);
			expect(verifyStub.calledWith("password", "password")).to.equal(true);
			expect(stubs.auditAddStub.called).to.equal(true);
			expect(req.loginEmail).to.equal("username");
			
			done();
		});
	});
	
	it("allows email confirmation request", done => {
		stubs.activationStub.resetHistory();
		stubs.mailStub.resetHistory();
		
		LocalAuth.onLocalEmailAuth({
			user: {
				username: "username",
			},
		}, res, () => {
			expect(stubs.activationStub.calledWith("username", sinon.match.any, "login")).to.equal(true);
			expect(stubs.mailStub.called).to.equal(true);
			
			done();
		});
	});
	
	it("confirms email confirmation request", done => {
		stubs.resolveStub.resetHistory();
		
		const req = {
			query: {
				token: "token",
				action: "login",
			},
		};
		LocalAuth.onEmailConfirm(req, res, () => {
			expect(stubs.resolveStub.calledWith("token", sinon.match.any, "login")).to.equal(true);
			
			done();
		});
	});
	
	it("allows registration request", done => {
		stubs.activationStub.resetHistory();
		stubs.mailStub.resetHistory();
		
		LocalAuth.onRegister({
			body: {
				email: "email",
			},
		}, res, () => {
			expect(stubs.activationStub.calledWith("email", sinon.match.any, "registration")).to.equal(true);
			expect(stubs.mailStub.called).to.equal(true);
			
			done();
		});
	});
	
	it("allows password change request", done => {
		stubs.activationStub.resetHistory();
		stubs.mailStub.resetHistory();
		
		LocalAuth.onChangeRequest({
			body: {
				email: "email",
			},
		}, res, () => {
			expect(stubs.activationStub.calledWith("email", sinon.match.any, "change")).to.equal(true);
			expect(stubs.mailStub.called).to.equal(true);
			
			done();
		});
	});
	
	it("confirms registration", done => {
		stubs.checkPassStub.resetHistory();
		stubs.resolveStub.resetHistory();
		
		const req = {
			body: {
				token: "token",
				password: "password",
			},
		};
		LocalAuth.onActivate(req, res, () => {
			expect(stubs.checkPassStub.calledWith(null, "password")).to.equal(true);
			expect(stubs.resolveStub.calledWith("token", sinon.match.any, "registration")).to.equal(true);
			expect(req.body.username).to.equal("username");
			
			done();
		});
	});
	
	it("confirms password change", done => {
		stubs.checkPassStub.resetHistory();
		stubs.resolveStub.resetHistory();
		stubs.findUserStub.resetHistory();
		
		const invalidateStub = sinon.stub(User, "manualInvalidateToken").resolves();
		const changeStub = sinon.stub(User, "changePassword").resolves();
		
		const req = {
			body: {
				token: "token",
				password: "password",
			},
		};
		LocalAuth.onChange(req, res, () => {
			expect(stubs.resolveStub.calledWith("token", sinon.match.any, "change")).to.equal(true);
			expect(stubs.checkPassStub.calledWith(1, "password")).to.equal(true);
			expect(stubs.findUserStub.calledWith("username")).to.equal(true);
			expect(invalidateStub.calledWith(1)).to.equal(true);
			expect(changeStub.calledWith(1, "password")).to.equal(true);
			expect(req.user.id).to.equal(1);
			
			done();
		});
	});
});