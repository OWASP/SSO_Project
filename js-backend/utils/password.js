const crypto = require("crypto");
const argon2 = require("argon2");
const https = require("https");
const url = require("url");

const isFailSafe = process.env.PWNEDPASSFAILSAFE ? (process.env.PWNEDPASSFAILSAFE==1) : false;

class PwUtil {
	constructor(dbConnection) {
		this.db = dbConnection;
	}
	checkPassword(userId, password) {
		return new Promise((resolve, reject) => {
			// Check password policy
			if(password.length < 8 || password.length > 100) return reject("Password does not match password policy");
			
			this.checkPwnedPasswords(password, isFailSafe).then(() => {
				// Check for older passwords
				if(userId === null || !this.db) {
					return resolve();
				} else {
					this.db.execute("SELECT password FROM passwords WHERE userId = ? ORDER BY created DESC LIMIT ?", [userId, process.env.PWHISTORY || 3], (err, results) => {
						if(err) return reject(err);
						
						const taskList = [];
						for(let i=0;i<results.length;i++) {
							taskList.push(this.verifyPassword(password, results[i].password));
						}
					
						Promise.all(taskList).then(verifyResults => {
							for(let i=0;i<verifyResults.length;i++) {
								if(verifyResults[i] === true) return reject("Password has been previously used");
							}
						
							return resolve();
						}).catch(reject);
					});
				}
			}).catch(reject);
		});
	}
	checkPwnedPasswords(password, failSafe) {
		return new Promise((resolve, reject) => {
			//return resolve();
			
			const shasum = crypto.createHash("sha1");
			shasum.update(password);
			const shahex = shasum.digest("hex").toUpperCase();
			const shaprefix = shahex.substr(0, 5);
			const shasuffix = shahex.substr(5);
			
			this.httpGet("https://api.pwnedpasswords.com/range/"+shahex.substr(0, 5)).then(body => {
				body.indexOf(shasuffix) != -1 ? reject("Password has been previously hacked and insecure") : resolve();
			}).catch(err => {
				console.error(err, response ? response.statusCode : null);
				failSafe===true ? reject("Error checking pwned passwords") : resolve();
			});
		});
	}
	hashPassword(password) {
		return argon2.hash(password, {
			type: process.env.ARGON2TYPE || argon2.argon2id,
			parallelism: process.env.ARGON2PARALLEL || 1,
			timeCost: process.env.ARGON2TIME || 5,
			memoryCost: process.env.ARGON2MEMORY || 200000, // 200 MB
		});
	}
	verifyPassword(password, hash) {
		return argon2.verify(hash, password);
	}
	createRandomString(length) {
		return new Promise((resolve, reject) => {
			crypto.randomBytes(length, (err, buffer) => {
				if(err) return reject(err);
				resolve(buffer.toString("hex"));
			});
		});
	}
	httpGet(toUrl) {
		return new Promise((resolve, reject) => {
			https.get(toUrl, response => {
				let body = "";
				response.on("data", (chunk) => body += chunk);
				response.on("end", () => resolve(body));
			}).on("error", reject);
		});
	}
	httpPost(toUrl, postData) {
		return new Promise((resolve, reject) => {
			const urlParts = url.parse(toUrl);
			const options = {
				hostname: urlParts.hostname,
				port: urlParts.port || 443,
				path: urlParts.path,
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Content-Length": postData.length,
				},
			};
			
			const req = https.request(options, response => {
				let body = "";
				response.on("data", (chunk) => body += chunk);
				response.on("end", () => resolve(body));
			});
			
			req.on("error", error => {
				reject(error);
			});

			req.write(postData);
			req.end();
		});
	}
}

exports.PwUtil = PwUtil;
