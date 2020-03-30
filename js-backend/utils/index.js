const mysql = require("mysql2");

const pwUtilLib = require("./password.js").PwUtil;
const UserLib = require("./user.js").User;
const Mailer = require("./mail.js").Mailer;
const Audit = require("./audit.js").Audit;
const JWTHandler = require("./jwt.js").JWTHandler;

const db = mysql.createConnection({
	host: process.env.DBHOST,
	user: process.env.DBUSER,
	database: process.env.DBDATABASE,
	password: process.env.DBPASS,
});

// Initiated
exports.DB = db;
exports.User = (new UserLib(db));
exports.PwUtil = (new pwUtilLib(db));
exports.Audit = (new Audit(db));

exports.JWT = (new JWTHandler());

const MailerConfig = {
	host: process.env.SMTPHOST,
	port: process.env.SMTPPORT,
	secureConnection: false, // Disable SSL
	tls: {
		rejectUnauthorized: process.env.SMTPSECURE || false,
		tls:{
			minVersion: "TLSv1.2",
		},
	},
};
if(process.env.SMTPUSER && process.env.SMTPPASS) {
	MailerConfig.auth = {
		user: process.env.SMTPUSER,
		pass: process.env.SMTPPASS,
	};
}
exports.Mailer = (new Mailer(MailerConfig));