const ipCountry = require("ip-country");

class Audit {
	constructor(dbConnection, ipCountrySettings) {
		this.db = dbConnection;
		
		ipCountry.init(ipCountrySettings);
	}
	
	add(userId, ip, object, action, attribute) {
		return new Promise((resolve, reject) => {
			const ipInfo = ipCountry.lookup(ip);
			const country = ipInfo ? ipInfo.country : null;
			
			this.db.execute("INSERT INTO audit (user, ip, country, object, action, attribute1) VALUES (?, ?, ?, ?, ?, ?)", [userId, ip, country, object, action, attribute], (err, result) => {
				if(err) return reject(err.message);
				resolve(result.insertId);
			});
		});
	}
	
	get(userId, offset, length) {
		return new Promise((resolve, reject) => {
			this.db.execute("SELECT * FROM audit where user = ? ORDER BY created DESC LIMIT ?, ?", [userId, offset, length], (err, results) => {
				if(err) return reject(err.message);
				resolve(results);
			});
		});
	}
}

exports.Audit = Audit;
