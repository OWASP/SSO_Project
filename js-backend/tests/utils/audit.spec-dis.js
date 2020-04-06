const { expect } = require("chai");
const sinon = require("sinon");

const dbStub = {
	execute: sinon.stub(),
};
dbStub.execute.callsArgWith(2, null, {
	insertId: "insertId",
});

const AuditClass = require("../../utils/audit.js").Audit;
const Audit = new AuditClass(dbStub, {});

const cefStub = sinon.stub(Audit, "cefSend");
cefStub.resolves({});

const mockPages = {
	"default": {
		syslog: "default-syslog",
	},
	"1": {
		syslog: "1-syslog",
	},
	"2": {
		syslog: "2-syslog",
	},
};

describe("Audit (Util)", () => {
	it("prepares loggers", () => {
		expect(Audit.customPages).to.equal(undefined);
		expect(Audit.version).to.equal(undefined);
		expect(Audit.heartbeatTimer).to.equal(undefined);
		expect(cefStub.called).to.equal(false);
		
		Audit.prepareLoggers(mockPages, "version");
		
		expect(cefStub.calledWith("default-syslog")).to.equal(true);
		expect(cefStub.calledWith("2-syslog")).to.equal(true);
		expect(Audit.heartbeatTimer).to.not.equal(undefined);
	});
	
	it("has a heartbeat", () => {
		cefStub.resetHistory();
		Audit.heartbeat();
		
		expect(cefStub.calledWith("default-syslog")).to.equal(true);
		expect(cefStub.calledWith("2-syslog")).to.equal(true);
	});
	
	it("adds an entry", async () => {
		cefStub.resetHistory();
		expect(dbStub.execute.called).to.equal(false);
		
		const insertId = await Audit.add({
			user: {
				id: 1,
			},
			connection: {
				remoteAddress: "127.0.0.1",
			},
			ssoRequest: {
				pageId: 1,
			},
			headers: {},
		}, "object", "action", "attribute");
		
		expect(dbStub.execute.called).to.equal(true);
		expect(cefStub.calledWith("default-syslog")).to.equal(true);
		expect(cefStub.calledWith("1-syslog")).to.equal(true);
		expect(cefStub.calledWith("2-syslog")).to.equal(false);
		expect(insertId).to.equal("insertId");
	});
	
	it("gets an entry", async () => {
		const results = await Audit.get("userId", "offset", "length");
		expect(results.insertId).to.equal("insertId");
	});
	
	it("gets the correct ip", () => {
		const baseItem = {
			connection: {
				remoteAddress: "127.0.0.1",
			},
			headers: {},
		};
		expect(Audit.getIP(baseItem)).to.equal("127.0.0.1");
		
		baseItem.headers["x-forwarded-for"] = "::1";
		expect(Audit.getIP(baseItem)).to.equal("::1");
	});
});