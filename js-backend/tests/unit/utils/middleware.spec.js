const { expect } = require("chai");
const sinon = require("sinon");

const { res, stubs } = require("../_shared.js");
const { User, JWT } = require("../../../utils");

const MiddlewareClass = require("../../../utils/middleware.js").MiddlewareHelper;
const Middleware = new MiddlewareClass();

const checkTokenStub = sinon.stub(Middleware, "checkAuthToken").resolves({
	id: 1,
	sub: 1,
	token: "token",
});

describe("Middleware (Util)", () => {
	it("can prevent timing attacks", done => {
		const times = [];
		for(let i=0;i<100;i++) {
			let thisTime = Date.now();
			Middleware.antiTiming(null, null, () => {
				const timeDiff = Date.now() - thisTime;
				times.push(timeDiff);
			});
		}
		
		setTimeout(() => {
			expect(times).to.be.a("array").has.lengthOf.above(10);
			
			const timeDiff = times[times.length-1] - times[0];
			
			expect(timeDiff).to.be.above(1000);
			done();
		}, 1500);
	});
	
	it("can rate-limit connections", done => {
		res.status.resetHistory();
		res.send.resetHistory();
		stubs.getIPStub.resetHistory();
		
		const maxRun = 13;
		const limiter = Middleware.rateLimit(5, 13, "Limit reached");
		
		let successCounter = 0;
		const queueList = [];
		for(let i=0;i<20;i++) {
			queueList.push(new Promise((resolve, reject) => {
				const req = {};
				limiter(req, res, () => {
					successCounter++;
					resolve();
				});
			}));
		}
		
		Promise.all(queueList).then(() => {
			expect.fail("Rate limitation was not enforced");
		});
		
		setTimeout(() => {
			expect(successCounter).to.equal(maxRun);
			expect(res.status.calledWith(429)).to.equal(true);
			expect(res.send.calledWith("Limit reached")).to.equal(true);
			
			done();
		}, 500);
	});
	
	it("can check the authorization header", done => {
		expect(checkTokenStub.called).to.equal(false);
		
		const req = {
			headers: {
				authorization: "Bearer token",
			},
		};
		
		Middleware.parseAuthHeader(req, null, () => {
			expect(checkTokenStub.calledWith("token")).to.equal(true);
			expect(req.user.id).to.equal(1);
			expect(req.user.token).to.equal("token");
			
			done();
		});
	});
	
	it("checks if the user is logged in", done => {
		res.status.resetHistory();
		Middleware.isLoggedIn({
			// user not logged in
		}, res, () => {
			expect.fail("Guest accepted as user");
		});
		expect(res.status.calledWith(403)).to.equal(true);
		
		Middleware.isLoggedIn({
			user: {
				id: 1,
			},
		}, res, () => {
			done();
		});
	});
	
	it("checks if the user is authenticated", done => {
		stubs.validateSessionStub.resetHistory();
		res.status.resetHistory();
		
		// Check login
		Middleware.isAuthenticated({
			user: {
				id: 1, // login token, but not authorized
			},
		}, res, () => {
			expect.fail("Login accepted as authenticated");
		});
		expect(res.status.calledWith(403)).to.equal(true);
		
		// Session deletion for wrong user
		const deleteSessionStub = sinon.stub(User, "deleteSession").resolves({});
		stubs.validateSessionStub.resolves({ userId: 2 });
		Middleware.isAuthenticated({
			user: {
				id: 1, // login token, but not authorized
				token: "token",
			},
		}, res, () => {
			expect.fail("Didn't spot wrong user");
		});
		
		setTimeout(() => {
			expect(deleteSessionStub.called).to.equal(true);
			expect(deleteSessionStub.calledWith("token")).to.equal(true);
			
			// All clear
			stubs.validateSessionStub.resolves({ userId: 1 });
			Middleware.isAuthenticated({
				user: {
					id: 1, // login token, but not authorized
					token: "token",
				},
			}, res, () => {
				expect(stubs.validateSessionStub.calledWith("token")).to.equal(true);
				done();
			});
		}, 10);
	});
	
	it("shows success", () => {
		res.status.resetHistory();
		res.send.resetHistory();
		
		Middleware.showSuccess(null, res);
		expect(res.status.calledWith(200)).to.equal(true);
		expect(res.send.calledWith("success")).to.equal(true);
	});
	
	it("creates a login token", done => {
		stubs.findUserStub.resetHistory().resolves({ id: 1 });
		
		JWT.sign = (data, token, expiration) => {
			expect(data.username).to.equal("loginEmail");
			expect(expiration).to.equal(JWT.age().MEDIUM);
			expect(token).to.equal("key");
			
			return new Promise((resolve, reject) => {
				resolve("jwt");
			});
		};
		res.json = obj => {
			expect(obj.factor).to.equal(1);
			expect(obj.test).to.equal("test");
			expect(obj.token).to.equal("jwt");
			expect(stubs.findUserStub.calledWith("loginEmail")).to.equal(true);
			
			done();
		};
		
		Middleware.createLoginToken({
			loginEmail: "loginEmail",
			returnExtra: {
				test: "test",
			},
		}, res, () => {
			expect.fail("Creating login token should not forward the request");
		});
	});
	
	it("creates an authenticated token", done => {
		stubs.userFindStub.resetHistory().resolves({ 
			id: 1,
			username: "username",
			password: "password",
			authenticators: [],
		});
		const createSessionStub = sinon.stub(User, "createSession").resolves("session");
		
		JWT.sign = (data, token, expiration) => {
			expect(data.sub).to.equal(1);
			expect(data.token).to.equal("session");
			expect(data.hasOwnProperty("password")).to.equal(false);
			expect(expiration).to.equal(JWT.age().LONG);
			expect(token).to.equal("key");
			
			return new Promise((resolve, reject) => {
				resolve("jwt");
			});
		};
		res.json = obj => {
			expect(obj.factor).to.equal(2);
			expect(obj.test).to.equal("test");
			expect(obj.username).to.equal("username");
			expect(obj.token).to.equal("jwt");
			
			expect(stubs.userFindStub.calledWith(1)).to.equal(true);
			expect(createSessionStub.calledWith(1)).to.equal(true);
			
			done();
		};
		
		Middleware.createAuthToken({
			user: {
				id: 1,
			},
			returnExtra: {
				test: "test",
			},
			body: {},
		}, res, () => {
			expect.fail("Creating authentication token should not forward the request");
		});
	});
});