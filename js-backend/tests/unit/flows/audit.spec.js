const { expect } = require("chai");
const sinon = require("sinon");

const { res, stubs } = require("../_shared.js");
const { Audit } = require("../../../utils");

const AuditFlowClass = require("../../../flows/audit.js").auditFlow;
const AuditFlow = new AuditFlowClass();

const userData = {
	id: 1,
	username: "username",
	password: "password",
	authenticators: [{
		userCounter: "userCounter",
		userKey: "userKey",
		userHandle: "userHandle",
	}],
};

describe("Audit (Flow)", () => {
	it("gets information about logged in user", done => {
		stubs.userFindStub.resetHistory().resolves(userData);
		stubs.validateSessionStub.resetHistory();
		
		res.json = data => {
			expect(stubs.userFindStub.calledWith(1)).to.equal(true);
			expect(stubs.validateSessionStub.called).to.equal(false);
			
			expect(data.isAuthenticated).to.equal(false);
			expect(data.hasOwnProperty("password")).to.equal(false);
			const authenticator = data.authenticators[0];
			expect(authenticator.userHandle).to.equal("userHandle");
			expect(authenticator.hasOwnProperty("userKey")).to.equal(false);
			
			done();
		};
		
		AuditFlow.getMe({
			user: {
				id: 1,
			},
		}, res);
	});
	
	it("gets information about authenticated user", done => {
		stubs.userFindStub.resetHistory().resolves(userData);
		stubs.validateSessionStub.resetHistory().resolves({ userId: 1 });
		
		res.json = data => {
			expect(stubs.userFindStub.calledWith(1)).to.equal(true);
			expect(stubs.validateSessionStub.calledWith("token")).to.equal(true);
			
			expect(data.isAuthenticated).to.equal(true);
			expect(data.hasOwnProperty("password")).to.equal(false);
			const authenticator = data.authenticators[0];
			expect(authenticator.userHandle).to.equal("userHandle");
			expect(authenticator.hasOwnProperty("userKey")).to.equal(false);
			
			done();
		};
		
		AuditFlow.getMe({
			user: {
				id: 1,
				token: "token",
			},
		}, res);
	});
	
	it("gets audit log list", done => {
		const auditGetListStub = sinon.stub(Audit, "getList").resolves([]);
		process.env.AUDITPAGELENGTH = 7;
		
		res.json = data => {
			expect(auditGetListStub.calledWith(1, 14, 7)).to.equal(true);
			
			done();
		};
		
		AuditFlow.getAuditLogs({
			query: {
				page: 2,
			},
			user: {
				id: 1,
			},
		}, res);
	});
	
	it("can report an audit event", done => {
		stubs.auditAddStub.resetHistory();
		res.status.resetHistory();
		
		const auditGetStub = sinon.stub(Audit, "get").resolves([{
			user: 1,
		}]);
		
		AuditFlow.reportAuditLog({
			user: {
				id: 2,
			},
			body: {
				id: 1,
			},
		}, res, () => {
			expect.fail("Wrong user was able to report event");
		});
		
		setTimeout(() => {
			expect(auditGetStub.calledWith(1)).to.equal(true);
			expect(stubs.auditAddStub.called).to.equal(false);
			expect(res.status.calledWith(404)).to.equal(true);
			res.status.resetHistory();
			
			// Now correct one
			AuditFlow.reportAuditLog({
				user: {
					id: 1,
				},
				body: {
					id: 1,
				},
			}, res, () => {
				expect(stubs.auditAddStub.called).to.equal(true);
				expect(res.status.calledWith(404)).to.equal(false);
				
				done();
			});
		}, 0);
	});
});