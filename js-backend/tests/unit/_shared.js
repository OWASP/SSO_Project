const sinon = require("sinon");

const db = {
	execute: sinon.stub().callsArgWith(2, null, {
		insertId: "insertId",
	}),
};
process.env.MOCKDB = db; // Allows to include utils/index.js
process.env.UNIQUEJWTTOKEN = "key";

const { User, Audit, PwUtil, Mailer, JWT } = require("../../utils");

const pages = require("../../websites.json");
pages["default"].syslog = "default-syslog";
pages["1"].syslog = "1-syslog";
pages["2"] = {
	syslog: "2-syslog",
};

module.exports = {
	pages,
	db,
	res: {
		status: sinon.stub().returnsThis(),
		send: sinon.stub().returnsThis(),
		json: sinon.stub().returnsThis(),
	},
	fido2Options: {
		updateCounter: sinon.stub(),
		readUser: sinon.stub(),
		addAuthenticator: sinon.stub(),
		verifyUser: sinon.stub(),
		rpId: "example",
		protocol: "https",
		origin: "https://example.com",
	},
	stubs: {
		// Environment variables are used to prevent classes being mocked
		auditAddStub: process.env.DONTMOCKAUDIT ? null : sinon.stub(Audit, "add").resolves(1),
		getIPStub: process.env.DONTMOCKAUDIT ? null : sinon.stub(Audit, "getIP").returns("127.0.0.1"),
		findUserStub: process.env.DONTMOCKUSER ? null : sinon.stub(User, "findUserByName"), // by name
		userFindStub: process.env.DONTMOCKUSER ? null : sinon.stub(User, "findUserById"), // by id
		activationStub: process.env.DONTMOCKUSER ? null : sinon.stub(User, "requestEmailActivation").resolves("token"),
		resolveStub: process.env.DONTMOCKUSER ? null : sinon.stub(User, "resolveEmailActivation").resolves({
			id: 1,
			username: "username",
		}),
		addAuthStub: process.env.DONTMOCKUSER ? null : sinon.stub(User, "addAuthenticator").resolves(),
		validateSessionStub: process.env.DONTMOCKUSER ? null : sinon.stub(User, "validateSession"),
		mailStub: process.env.DONTMOCKMAILER ? null : sinon.stub(Mailer, "sendMail").callsArgWith(1, null),
		checkPassStub: process.env.DONTMOCKPWUTIL ? null : sinon.stub(PwUtil, "checkPassword").resolves(),
		jwtSignStub: process.env.DONTMOCKJWT ? null : sinon.stub(JWT, "sign").resolves("jwt"),
		jwtVerifyStub: process.env.DONTMOCKJWT ? null : sinon.stub(JWT, "verify"),
	},
};

