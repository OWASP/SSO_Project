const base64url = require("base64-arraybuffer");

class Fido2Strategy {
	// Init
	constructor(opts) {
		this.name = "fido2";
		
		this._updateCounter = opts.updateCounter;
		this._readUser = opts.readUser;
		this._addAuthenticator = opts.addAuthenticator;
		
		this._verifyUser = opts.verifyUser || (() => true);
		this.factor = opts.factor || "either";
		this.timeout = opts.timeout || 15*60;
		this.protocol = opts.protocol || "https";

		if(opts.rpId == "localhost") {
			if(!opts.protocol) this.protocol = "http"; // localhost runs on http by default
			
			const fs = require("fs");
			const packageList = require("./package.json");
			
			const utilsLocation = require.resolve("fido2-lib/lib/utils.js");
			if(!opts.disableLocalhostPatching && packageList.dependencies["fido2-lib"] == "^2.1.1" && fs.statSync(utilsLocation).size == 7054) {
				// FIDO2-Lib does not natively support localhost and due to little maintenance this issue hasn't been fixed yet. See https://github.com/apowers313/fido2-lib/pull/19/files
				// To increase usability, this script automatically patches this library if you want to use localhost
				console.warn("Localhost was detected for FIDO2 passport strategy - patching fido2-lib now!");
				
				const oldContent = fs.readFileSync(utilsLocation, {encoding: "UTF-8"});
				fs.writeFileSync(utilsLocation, oldContent.replace('if (originUrl.protocol !== "https:") {', 'if (originUrl.protocol !== "https:" && originUrl.hostname !== "localhost") {'));
			}
			this.origin = this.protocol + "://localhost" + (opts.port != 80 ? ":"+opts.port : "");
		}
		
		this.origin = this.origin || this.protocol + "://" + opts.rpId;
		
		const { Fido2Lib } = require("fido2-lib"); // late loading in case we need to patch it
		this.f2l = new Fido2Lib(opts);
	}
	
	// Registration
	async initRegister(userId) {
		const regOptions = await this.f2l.attestationOptions();
		regOptions.user.id = base64url.encode(this.str2ab(userId));
		regOptions.challenge = base64url.encode(regOptions.challenge);
		
		return regOptions;
	}
	initRegisterExpress = async (req, resp) => {
		const userId = req.query.userId;
		const regOptions = await this.initRegister(userId);
		
		req.session.fido2RegChallenge = regOptions.challenge;
		return resp.json(regOptions);
	}
	finishRegister(userId, opts, req) {
		return new Promise(async (resolve, reject) => {
			const {challenge, response} = opts;
			response.rawId = base64url.decode(response.rawId);
			
			const attestationExpectations = {
				challenge: challenge,
				origin: this.origin,
				factor: this.factor,
			};
			
			let regResult = null;
			try {
				regResult = await this.f2l.attestationResult(response, attestationExpectations);
			} catch(e) {
				console.error(e);
				return reject("Attestation/Registration failed");
			}
			const authnrData = regResult.authnrData;
			const credId = base64url.encode(authnrData.get("credId"));
			
			try {
				await this._addAuthenticator(userId, {
					userCounter: authnrData.get("counter"), 
					userHandle: credId, 
					userKey: authnrData.get("credentialPublicKeyPem"),
				}, req);
			} catch(e) {
				return reject(e);
			}

			return resolve({
				"counter": authnrData.get("counter"),
				"credentialId": credId,
				"publicKey": authnrData.get("credentialPublicKeyPem"),
			});
		});
	}
	finishRegisterExpress = (req, resp, next) => {
		const userId = req.body.userId;
		if(!this._verifyUser(req, userId)) {
			return resp.status(403).json({error: "Unauthorized userId"});
		}
		
		return this.finishRegister(userId, {
			challenge: req.session.fido2RegChallenge,
			response: req.body.response,
		}, req).then(finishObj => {
			if(typeof next === "undefined") {
				resp.json(finishObj);
			} else {
				req.authenticator = finishObj;
				next();
			}
		}).catch(err => {
			console.error(err);
			resp.status(400).json({error: err});
		});
	}
	
	// Login
	initLogin(userId) {
		const that = this;
		return new Promise(async (resolve, reject) => {
			const logOptions = await that.f2l.assertionOptions();
			logOptions.challenge = base64url.encode(logOptions.challenge);
			logOptions.allowCredentials = [];
			
			const user = await that._readUser(userId);
			if(!user) return reject("User does not exist");
			if(!user.authenticators.length) return reject("User has no authenticators configured");
			
			const credList = user.authenticators;
			for(let i=0;i<credList.length;i++) {
				logOptions.allowCredentials.push({"id": credList[i].userHandle, type: "public-key"});
			}
			
			return resolve(logOptions);
		});
	}
	initLoginExpress = async (req, resp) => {
		const userId = req.query.userId;
		
		return this.initLogin(userId).then(logOptions => {
			req.session.fido2LogChallenge = logOptions.challenge;
			resp.json(logOptions);
		}).catch(e => {
			resp.status(400).json({error: e});
		});
	}
	finishLogin(userId, opts) {
		const that = this;
		return new Promise(async (resolve, reject) => {
			const {challenge, response} = opts;
			
			const user = await that._readUser(userId);
			if(!user) return reject("User does not exist");
			
			const credList = user.authenticators;
			const credListFiltered = credList.filter(x => x.userHandle == response.rawId);
			if(!credListFiltered.length) return reject("Authenticator does not exist");
			const thisCred = credListFiltered.pop();
			
			const assertionExpectations = {
				challenge: challenge,
				origin: that.origin,
				factor: that.factor,
				publicKey: thisCred.userKey,
				prevCounter: thisCred.userCounter,
				userHandle: thisCred.userHandle,
			};
			response.rawId = base64url.decode(response.rawId);
			response.response.authenticatorData = base64url.decode(response.response.authenticatorData);
			
			let logResult = null;
			try {
				logResult = await that.f2l.assertionResult(response, assertionExpectations);
			} catch(e) {
				return reject(e);
			}
			
			const returnObj = {
				counter: logResult.authnrData.get("counter"),
				flags: logResult.authnrData.get("flags"),
			};
			await that._updateCounter(thisCred.userHandle, returnObj.counter);
			
			return resolve({user, authenticator: thisCred});
		});
	}
	finishLoginExpress = (req, resp, next) => {
		const userId = req.body.userId;
		if(!this._verifyUser(req, userId)) {
			return resp.status(403).json({error: "Unauthorized userId"});
		}
		
		return this.finishLogin(userId, {
			challenge: req.session.fido2LogChallenge,
			response: req.body.response,
		}).then(result => {
			const { authenticator } = result;
			req.authenticator = authenticator;
			next();
		}).catch(e => {
			resp.status(400).json({error: e});
		});
	}
	// Helpers
	str2ab(str) {
		let enc = new TextEncoder();
		return enc.encode(str);
	}
}

exports.Fido2Strategy = Fido2Strategy;