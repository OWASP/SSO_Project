const mysql = require("mysql2");
const process = require("process");

const pwUtilLib = require("./password.js").PwUtil;
const UserLib = require("./user.js").User;
const Mailer = require("./mail.js").Mailer;
const Audit = require("./audit.js").Audit;
const JWTHandler = require("./jwt.js").JWTHandler;

// MOCKDB is only used by unit tests and can not be set as a normal environment variable
/*let db;
const startTime = Date.now();
*/
/*
(async function() {
	while (true) {
		db = process.env.MOCKDB ? process.env.MOCKDB : mysql.createConnection({
			host: process.env.DBHOST,
			user: process.env.DBUSER,
			database: process.env.DBDATABASE,
			password: process.env.DBPASS,
		});
		const pingResult = await new Promise(resolve => {
			db.ping(err => {
				resolve(err);
			});
		});
		
		if(pingResult) {
			if(Date.now() > (startTime+10*60*1000)) {
				console.error("Timeout reached");
				process.exit(1);
			}
			
			// Waiting for database to be ready
			console.warn("Database not (yet?) available, waiting...", pingResult.message);
		} else {
			console.log("Database ready");
			break;
		}
		
		await new Promise(resolve => setTimeout(resolve, 10000));
	}
	
	
}());*/
/*let sleepy = true;
while (true) {
	db = process.env.MOCKDB ? process.env.MOCKDB : mysql.createConnection({
		host: process.env.DBHOST,
		user: process.env.DBUSER,
		database: process.env.DBDATABASE,
		password: process.env.DBPASS,
	});
	db.ping(err => {
		console.log("ping", err);
		if(err) {
			console.warn("Database not (yet?) available, waiting...", err);
		} else {
			sleepy = false;
		}
	});
	
	if(sleepy) {
		if(Date.now() > (startTime+10*60*1000)) {
			console.error("Timeout reached");
			process.exit(1);
		}
	} else {
		console.log("Database ready");
		break;
	}
	
	console.log("go to sleep", sleepy);
	sleep(5);
}*/

const db = process.env.MOCKDB ? process.env.MOCKDB : mysql.createConnection({
	host: process.env.DBHOST,
	user: process.env.DBUSER,
	database: process.env.DBDATABASE,
	password: process.env.DBPASS,
});
db.ping(err => {
	console.log("ping", err);
	if(err) {
		console.warn("Database not (yet?) available, waiting...", err);
		sleep(5);
		process.exit(0); // to not throw off the e2e test, but force a restart
	}
});

console.log("continuing with db already");

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


function sleep(seconds) {
	console.log("start sleep for", seconds, "seconds");
	var waitTill = new Date(new Date().getTime() + seconds * 1000);
	while(waitTill > new Date()){}
	console.log("finished sleeping");
}