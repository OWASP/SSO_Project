const pwUtilLib = require("./password.js").PwUtil;

const actionMap = {
	"registration": 0,
	"login": 1,
	"change": 2,
};

class User {
	constructor(dbConnection) {
		this.db = dbConnection;
		this.pwUtil = new pwUtilLib(dbConnection);
	}	
	requestEmailActivation(username, ip, action) {
		return new Promise((resolve, reject) => {
			if(!(action in actionMap)) return reject("Action unknown");
			const actionId = actionMap[action];
		
			this.db.execute("SELECT * FROM users WHERE username = ?", [username], (err, results) => {
				if(err) return reject(err);
				if(results.length && action == "registration") {
					return reject("Email address already registered");
				} else if(!results.length && action != "registration") {
					return reject("User unknown");
				}
				
				this.pwUtil.createRandomString(30).then(token => {
					this.db.execute("INSERT INTO emailConfirm (username, token, request_ip, action) VALUES (?, ?, ?, ?)", [username, token, ip, actionId], err => {
						if(err) return reject(err);
						
						resolve(token);
					});
				}).catch(reject);
			});
		});
	}
	resolveEmailActivation(token, ip, action, noInvalidate) {
		return new Promise((resolve, reject) => {
			if(!(action in actionMap)) return reject("Action unknown");
			const actionId = actionMap[action];
			
			this.db.execute("SELECT * FROM emailConfirm WHERE token = ? AND action = ?", [token, actionId], (err, results) => {
				if(err) return reject(err);
				if(!results.length) return reject("Token not found");
				const confirmation = results.pop();
			
				if(confirmation.request_ip != ip) {
					console.warn("Email confirmation IPs do not match:", confirmation.request_ip, ip);
					return reject("Your IP must stay the same from request to confirmation");
				}
				
				// Invalidate token already
				if(typeof noInvalidate == "undefined" || !noInvalidate) {
					this.db.execute("DELETE FROM emailConfirm WHERE id = ?", [confirmation.id], () => {});
				}
				
				const nowDate = new Date();
				if(nowDate-confirmation.added > 24*60*60*1000) {
					return reject("Token expired");
				}
				
				resolve(confirmation);
			});
		});
	}
	manualInvalidateToken(id) {
		return new Promise((resolve, reject) => {
			this.db.execute("DELETE FROM emailConfirm WHERE id = ?", [id], (err) => {
				if(err) return reject(err);
				resolve();
			});
		});
	}
	addUser(username, password) {
		return new Promise((resolve, reject) => {
			if(password == null) {
				this.db.execute("INSERT INTO users (username, created) VALUES (?, NOW())", [username], (err, result) => {
					if(err) return reject(err);
					
					const userId = result.insertId;
					resolve(userId);
				});
			} else {
				this.pwUtil.checkPassword(null, password).then(() => {
					this.db.execute("INSERT INTO users (username, created) VALUES (?, NOW())", [username], (err, result) => {
						if(err) return reject(err);
						
						const userId = result.insertId;
						this.pwUtil.hashPassword(password).then(hash => {
							this.db.execute("INSERT INTO passwords (userId, password) VALUES(?, ?)", [userId, hash], (err) => {
								if(err) return reject(err);
								
								resolve(userId);
							});
						}).catch(reject);
					});
				}).catch(reject);
			}
		});
	}
	changePassword(userId, newPassword) {
		return new Promise((resolve, reject) => {

			this.pwUtil.hashPassword(newPassword).then(hash => {
				this.db.execute("INSERT INTO passwords (userId, password) VALUES(?, ?)", [userId, hash], (err) => {
					if(err) return reject(err);
					
					resolve(userId);
				});
			}).catch(reject);
		});
	}
	findUserById(userId) {
		return this.findUserByAttribute("id", userId);
	}
	findUserByName(userName) {
		return this.findUserByAttribute("username", userName);
	}
	findUserByAttribute(attributeName, attributeVal) {
		return new Promise((resolve, reject) => {
			this.db.execute("SELECT * FROM users WHERE "+attributeName+" = ?", [attributeVal], (err, results) => {
				if(err) return reject(err);
				if(!results.length) return reject("User not found");
				
				const user = results.pop();
				Promise.all([
					this.findAuthenticatorByUser(user.id),
					this.findPasswordByUser(user.id),
				]).then(userDetails => {
					const [authenticators, passHash] = userDetails;
					
					user.authenticators = authenticators;
					user.password = passHash;
					
					resolve(user);
				}).catch(reject);
			});
		});
	}
	updateLoginTime(userId) {
		return new Promise((resolve, reject) => {
			this.db.execute("UPDATE users SET last_login = NOW() WHERE id = ?", [userId], (err) => {
				if(err) return reject(err);
				resolve();
			});
		});
	}
	createSession(userId) {
		return new Promise((resolve, reject) => {
			this.pwUtil.createRandomString(30).then(token => {
				this.db.execute("INSERT INTO userSessions (userId, token, added) VALUES (?, ?, NOW())", [userId, token], (err, result) => {
					if(err) return reject(err);
					resolve(token);
				});
			}).catch(reject);
		});
	}
	validateSession(token) {
		return new Promise((resolve, reject) => {
			if(!token) return reject("Token empty");
			this.db.execute("SELECT * FROM userSessions WHERE token = ?", [token], (err, results) => {
				if(err) return reject(err);
				if(!results.length) return reject("Token not known");
				
				const result = results.pop();
				this.db.execute("UPDATE userSessions SET last_seen = NOW() WHERE id = ?", [result.id], err => {
					if(err) return reject(err);
					resolve(result);
				});
			});
		});
	}
	cleanSession(userId, surviveToken) {
		return new Promise((resolve, reject) => {
			this.db.execute("DELETE FROM userSessions WHERE userId = ? AND token != ?", [userId, surviveToken], e => {
				if(e) return reject(e);
				resolve();
			});
		});
	}
	deleteSession(token) {
		return new Promise((resolve, reject) => {
			this.db.execute("DELETE FROM userSessions WHERE id = ?", [token], () => {
				resolve();
			});
		});
	}
	findPasswordByUser(userId) {
		return new Promise((resolve, reject) => {
			this.db.execute("SELECT password FROM passwords WHERE userId = ? ORDER BY created DESC LIMIT 1", [userId], (err, results) => {
				if(err) return reject(err);
				if(!results.length) return resolve(null);
				const passwordObj = results.pop();
				resolve(passwordObj.password);
			});
		});
	}
	addAuthenticator(type, username, label, authenticatorObj) {
		return new Promise((resolve, reject) => {
			const {userCounter, userHandle, userKey} = authenticatorObj;
			
			this.findUserByName(username).then(user => {
				this.db.execute("INSERT INTO authenticators (userId, label, handle, counter, publicKey, type) VALUES (?,?,?,?,?, ?)", [user.id, label, userHandle, userCounter, userKey, type], (err) => {
					if(err) return reject(err);
					return resolve();
				});
			}).catch(reject);
		});
	}
	removeAuthenticator(type, userId, handle) {
		return new Promise((resolve, reject) => {
			this.db.execute("DELETE FROM authenticators WHERE userId = ? AND handle = ? and type = ?", [userId, handle, type], e => {
				if(e) return reject(e);
				resolve();
			});
		});
	}
	updateAuthenticatorCounter(type, handle, newCounter) {
		return new Promise((resolve, reject) => {
			this.db.execute("UPDATE authenticators SET counter = ? WHERE handle = ? AND type = ?", [newCounter, handle, type], (err) => {
				if(err) return reject(err);
				return resolve();
			});
		});
	}
	findAuthenticatorByUser(userId) {
		return new Promise((resolve, reject) => {
			this.db.execute("SELECT * FROM authenticators WHERE userId = ?", [userId], (err, results) => {
				if(err) return reject(err);
				
				const handleList = [];
				for(let i=0;i<results.length;i++) {
					const item = results[i];
					handleList.push({
						label: item.label,
						userHandle: item.handle, 
						userCounter: item.counter, 
						userKey: item.publicKey,
						type: item.type,
					});
				}
				
				return resolve(handleList);
			});
		});
	}
}

exports.User = User;