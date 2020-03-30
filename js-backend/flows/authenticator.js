const base64url = require("base64-arraybuffer");
const { User, Audit, JWT } = require("../utils");
const { Fido2Lib } = require("fido2-lib");

class Authenticator {
	constructor(fido2Options) {
		this.f2l = new Fido2Lib(fido2Options);
		this.fido2Options = fido2Options;
		this.ownJwtToken = process.env.UNIQUEJWTTOKEN;
	}
	
	onAuthenticatorDelete(req, res, next) {
		Audit.add(req, "authenticator", "remove", req.body.handle).then(aID => {
			User.removeAuthenticator(req.body.type, req.user.id, req.body.handle).then(() => {
				next();
			}).catch(err => {
				res.status(400).send(err);
			});
		}).catch(err => {
			res.status(500).send(err);
		});
	}
	
	onFidoRegisterGet(req, res, next) {
		const userId = req.user.id;
		this.f2l.attestationOptions().then(regOptions => {
			regOptions.user.id = base64url.encode(this.str2ab(userId));
			regOptions.challenge = base64url.encode(regOptions.challenge);
			req.regOptions = regOptions;
			
			return JWT.sign({
				sub: userId,
				challenge: regOptions.challenge,
			}, this.ownJwtToken, JWT.age().SHORT);
		}).then(jwtData => {
			res.status(200).json({
				"token": jwtData,
				"options": req.regOptions,
			});
		}).catch(err => {
			console.error(err);
			return res.status(500).send("Attestation generation failed");
		});
	}
	
	onFidoRegisterPost(req, res, next) {
		const userId = req.user.id;
		const regResponse = req.body.response;
		const label = req.body.label;
		
		JWT.verify(req.body.token, this.ownJwtToken, {
			maxAge: JWT.age().SHORT,
			subject: userId,
		}).then(regToken => {
			const challenge = regToken.challenge;
			regResponse.rawId = base64url.decode(regResponse.rawId);
			
			const attestationExpectations = {
				challenge: challenge,
				origin: this.fido2Options.origin,
				factor: this.fido2Options.factor,
			};
			
			return this.f2l.attestationResult(regResponse, attestationExpectations);
		}).then(regResult => {
			const authnrData = regResult.authnrData;
			const credId = base64url.encode(authnrData.get("credId"));
			req.fido2 = {
				counter: authnrData.get("counter"),
				credentialId: credId,
				publicKey: authnrData.get("credentialPublicKeyPem"),
			};
			
			return Audit.add(req, "authenticator", "add", label + " ("+credId+")");
			
		}).then(() => {
			return User.addAuthenticator("fido2", req.user.username, label, {
				userCounter: req.fido2.counter,
				userHandle: req.fido2.credentialId, 
				userKey: req.fido2.publicKey,
			});
		}).then(() => {
			next();
		}).catch(err => {
			console.error(err);
			return res.status(400).send("Attestation failed");
		});
	}
	
	onFidoLoginGet(req, res, next) {
		const userId = req.user.id;
		
		Promise.all([
			this.f2l.assertionOptions(),
			User.findUserById(userId),
		]).then(values => {
			const logOptions = values[0];
			logOptions.challenge = base64url.encode(logOptions.challenge);
			logOptions.allowCredentials = [];
			
			const user = values[1];
			user.authenticators = user.authenticators.filter(x => x.type == "fido2");
			
			const credList = user.authenticators;
			for(let i=0;i<credList.length;i++) {
				logOptions.allowCredentials.push({"id": credList[i].userHandle, type: "public-key"});
			}
			
			req.logOptions = logOptions;
			return JWT.sign({
				sub: userId,
				challenge: logOptions.challenge,
			}, this.ownJwtToken, JWT.age().SHORT);
		}).then(jwtData => {
			return res.status(200).json({
				"token": jwtData,
				"options": req.logOptions,
			});
		}).catch(err => {
			console.error(err);
			return res.status(500).send("Assertation generation failed");
		});
	}
	
	onFidoLoginPost(req, res, next) {
		const userId = req.user.id;
		const logResponse = req.body.response;
		
		let thisCred, challenge;
		JWT.verify(req.body.token, this.ownJwtToken, {
			maxAge: JWT.age().SHORT,
			subject: userId,
		}).then(jwtToken => {
			challenge = jwtToken.challenge;
			
			return User.findUserById(userId);
		}).then(user => {
			const credList = user.authenticators;
			const credListFiltered = credList.filter(x => x.userHandle == logResponse.rawId);
			
			if(!credListFiltered.length) return res.status(404).send("Authenticator does not exist");
			thisCred = credListFiltered.pop();
			logResponse.rawId = base64url.decode(logResponse.rawId);
			logResponse.response.authenticatorData = base64url.decode(logResponse.response.authenticatorData);
			
			const assertionExpectations = {
				challenge: challenge,
				origin: this.fido2Options.origin,
				factor: this.fido2Options.factor,
				publicKey: thisCred.userKey,
				prevCounter: thisCred.userCounter,
				userHandle: thisCred.userHandle,
			};
			
			return this.f2l.assertionResult(logResponse, assertionExpectations);
		}).then(logResult => {
			const returnObj = {
				counter: logResult.authnrData.get("counter"),
				flags: logResult.authnrData.get("flags"),
			};
			return Promise.all([
				User.updateAuthenticatorCounter("fido2", thisCred.userHandle, returnObj.counter),
				Audit.add(req, "authenticator", "login", thisCred.label + " (" + thisCred.userHandle + ")"),
			]);
		}).then(() => {
			next();
		}).catch(err => {
			return res.status(400).send(err.message);
		});
	}
	
	// String -> base64
	str2ab(str) {
		const enc = new TextEncoder();
		return enc.encode(str);
	}
	
	// Verify authenticator label
	checkLabel(req, res, next) {
		const label = req.body.label;
		if(!label || label.length > 25 || label.match(/[^\w \-]/)) {
			return res.status(400).send("Invalid label name");
		}
		next();
	}
}

exports.authenticatorFlow = Authenticator;