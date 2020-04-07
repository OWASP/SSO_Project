const jwt = require("jsonwebtoken");

class JWTHandler {
	constructor() {
		this.hostname = process.env.DOMAIN || "localhost";
	}
	
	age() {
		return {
			SHORT: "5m",
			MEDIUM: "1h",
			LONG: "1y",
		};
	}
	
	verify(tokenData, tokenKey, options) {
		return new Promise((resolve, reject) => {
			if(!options.hasOwnProperty("issuer")) {
				options.issuer = this.hostname;
			}
			if(!options.hasOwnProperty("audience")) {
				options.audience = this.hostname;
			}
			if(!options.hasOwnProperty("maxAge")) {
				options.maxAge = this.age().SHORT;
			}
			
			try {
				const result = jwt.verify(tokenData, tokenKey, options);
				resolve(result);
			} catch(error) {
				//console.error(error);
				return reject(error);
			}
		});
	}
	
	sign(tokenData, tokenKey, expiration) {
		return new Promise((resolve, reject) => {
			if(!tokenData.hasOwnProperty("iss")) {
				tokenData.iss = this.hostname;
			}
			if(!tokenData.hasOwnProperty("aud")) {
				tokenData.aud = this.hostname;
			}
			
			jwt.sign(tokenData, tokenKey, {
				expiresIn: expiration,
			}, (err, jwtData) => {
				if(err) return reject(err);
				resolve(jwtData);
			});
		});
	}
}

exports.JWTHandler = JWTHandler;