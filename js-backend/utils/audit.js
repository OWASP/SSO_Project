const ipCountry = require("ip-country");
const syslogPro = require("syslog-pro");

class Audit {
	constructor(dbConnection, ipCountrySettings) {
		this.db = dbConnection;
		
		ipCountry.init(ipCountrySettings);
	}
	prepareLoggers(customPages, version) {
		this.customPages = customPages;
		this.version = version;
		
		// Send hello
		const scheduledPromises = [];
		for (let websiteIndex of Object.keys(this.customPages)) {
			const thisPage = this.customPages[websiteIndex];
			if(!thisPage.hasOwnProperty("syslog")) continue;

			scheduledPromises.push(this.cefSend(thisPage.syslog, {
				"meta": "start",
			}));
		}
		
		Promise.all(scheduledPromises).then(() => {});
		
		// Stop previous and start new heartbeat
		if(this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
		}
		this.heartbeatTimer = setInterval(this.heartbeat.bind(this), (process.env.SYSLOGHEARTBEAT || 60) * 1000);
	}
	add(req, object, action, attribute) {
		return new Promise((resolve, reject) => {
			const userId = req.user ? req.user.id : null;
			const ip = this.getIP(req);
			const ipInfo = ipCountry.lookup(ip);
			const country = ipInfo ? ipInfo.country : null;
			
			const loggers = [];
			if(this.customPages["default"].hasOwnProperty("syslog")) {
				loggers.push(this.customPages["default"].syslog);
			}
			if(req.ssoRequest) {
				const thisPage = this.customPages[req.ssoRequest.pageId.toString()];
				if(thisPage.hasOwnProperty("syslog")) {
					loggers.push(thisPage.syslog);
				}
			}
			
			const scheduledPromises = [
				this.databaseAdd(userId, ip, country, object, action, attribute),
			];
			loggers.forEach(syslogItem => {
				scheduledPromises.push(this.cefSend(syslogItem, {userId, ip, country, object, action, attribute}));
			});
			
			Promise.all(scheduledPromises).then(results => {
				resolve(results[0]);
			}).catch(err => {
				console.error(err);
				reject(err.message);
			});
		});
	}
	getList(userId, offset, length) {
		return new Promise((resolve, reject) => {
			this.db.execute("SELECT * FROM audit where user = ? ORDER BY created DESC LIMIT ?, ?", [userId, offset, length], (err, results) => {
				if(err) return reject(err.message);
				resolve(results);
			});
		});
	}
	get(id) {
		return new Promise((resolve, reject) => {
			this.db.execute("SELECT * FROM audit where id = ?", [id], (err, results) => {
				if(err) return reject(err.message);
				resolve(results);
			});
		});
	}
	databaseAdd(userId, ip, country, object, action, attribute) {
		return new Promise((resolve, reject) => {
			this.db.execute("INSERT INTO audit (user, ip, country, object, action, attribute1) VALUES (?, ?, ?, ?, ?, ?)", [userId, ip, country, object, action, attribute], (err, result) => {
				if(err) return reject(err.message);
				resolve(result.insertId);
			});
		});
	}
	heartbeat() {
		const scheduledPromises = [];
		for (let websiteIndex of Object.keys(this.customPages)) {
			const thisPage = this.customPages[websiteIndex];
			if(!thisPage.hasOwnProperty("syslog")) continue;
			
			scheduledPromises.push(this.cefSend(thisPage.syslog, {
				"meta": "heartbeat",
			}));
		}
		
		Promise.all(scheduledPromises).then(() => {}).catch(err => {
			console.error("Heartbeat failed", err);
		});
	}
	cefSend(syslogDst, attributes) {
		const cefMessage = new syslogPro.CEF({
			deviceVendor: "OWASP Foundation",
			deviceProduct: "OWASP SSO",
			deviceVersion: this.version,
			deviceEventClassId: "audit",
			name: "OWASP SSO",
			extensions: attributes,
			server: syslogDst,
		});
		return cefMessage.send();
	}
	getIP(req) {
		return req.headers["x-forwarded-for"] || req.connection.remoteAddress;
	}
}

exports.Audit = Audit;
