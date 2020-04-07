const sinon = require("sinon");

const dbExecute = sinon.stub();
dbExecute.callsArgWith(2, null, {
	insertId: "insertId",
});

module.exports = {
	pages: {
		"default": {
			syslog: "default-syslog",
		},
		"1": {
			syslog: "1-syslog",
		},
		"2": {
			syslog: "2-syslog",
		},
	},
	db: {
		execute: dbExecute,
	},
	res: {
		status: sinon.stub().returnsThis(),
		send: sinon.stub().returnsThis(),
		json: sinon.stub().returnsThis(),
	},
};

