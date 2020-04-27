const validator = require("validator");
const { Audit, User, JWT } = require("../utils");
const Middleware = new (require("../utils/middleware.js").MiddlewareHelper)();

const samlp = require("samlp");
const PassportProfileMapper = require(require.resolve("samlp/lib/claims/PassportProfileMapper.js"));
PassportProfileMapper.prototype.getClaims = function() {
	// Default one requires firstname & lastname, which we can not provide
	return claims = {
		"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier": this._pu.id,
		"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress": this._pu.displayName,
		"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name": this._pu.displayName,
	};
};

class ssoFlow {
	constructor(customPages, fido2Options, serverCrt, serverKey) {
		this.ownJwtToken = process.env.UNIQUEJWTTOKEN;
		this.customPages = customPages;
		this.fido2Options = fido2Options;
		this.serverCrt = serverCrt;
		this.serverKey = serverKey;
	}

	// Then for the flow out, the client just requests an "outgoing" token for a page
	// Test eg via http://jwtbuilder.jamiekurtz.com/
	async onFlowIn(req, res, next) {
		const dataIn = req.query.d || req.body.d;
		const pageId = req.query.id || req.body.id;
		if(!pageId || isNaN(pageId)) {
			return res.status(400).send("Invalid flow request - missing parameters");
		} else if(!this.customPages.hasOwnProperty(pageId)) {
			return res.status(404).send("Website ID not found");
		}
		const thisPage = this.customPages[pageId];
		let jwtInput;
		
		if(!dataIn && thisPage.signedRequestsOnly) {
			return res.status(403).send("This website is configured to only allow signed login requests");
		}
		if(dataIn) {
			try {
				jwtInput = await JWT.verify(dataIn, thisPage.jwt, {
					maxAge: JWT.age().SHORT,
					issuer: thisPage.name,
				});
			} catch(err) {
				//console.error(err)
				return res.status(403).send(err.name + ": " + err.message);
			}
		}
		//console.log("jwtInput", jwtInput)
		
		const jwtObj = {
			pageId,
			jwt: true,
		};
		if(jwtInput && jwtInput.hasOwnProperty("sub")) {
			jwtObj.sub = jwtInput.sub;
		}
		JWT.sign(jwtObj, this.ownJwtToken, JWT.age().LONG).then(jwtData => {
			req.returnExtra = {
				page: {
					pageId,
					name: thisPage.name,
					branding: thisPage.branding,
					token: jwtData,
					flowType: "jwt",
				},
			};
			if(thisPage.hasOwnProperty("terms")) {
				req.returnExtra.page.terms = thisPage.terms;
			}
			
			if(jwtInput && jwtInput.hasOwnProperty("sub")) {
				if(!validator.isEmail(jwtInput.sub+"")) {
					return res.status(400).send("Subject is not a valid email address");
				}
				
				const email = jwtInput.sub;
				req.returnExtra.page.username = email;
				User.findUserByName(email).then(userData => {
					req.loginEmail = email;
					req.user = userData;
					return Audit.add(req, "page", "request", thisPage.name);
				}).then(() => {
					// Artificially log in as this user
					Middleware.createLoginToken(req, res, next);
				}).catch(err => {
					console.error(err);
					
					// User does not exist - register
					User.addUser(email, null).then(userId => {
						return User.findUserById(userId);
					}).then(userData => {
						req.loginEmail = email;
						req.user = userData;
						
						return Audit.add(req, "page", "registration", thisPage.name);
					}).then(() => {
						Middleware.createLoginToken(req, res, next);
					}).catch(err => {
						console.error(err);
						res.status(500).send("Creating user automatically failed");
					});
				});
			} else {
				res.status(200).json(req.returnExtra);
			}
		}).catch(err => {
			res.status(500).send("Signing failed");
		});
	}

	onFlowOut(req, res, next) {
		const jwtRequest = req.ssoRequest;
		const pageId = jwtRequest.pageId;
		const thisPage = this.customPages[pageId];
		
		if(jwtRequest.hasOwnProperty("sub")) {
			if(req.user.username.toLowerCase() != jwtRequest.sub.toLowerCase()) {
				return res.status(403).send("The website needs you to be explicitly signed into the account it requested");
			}
		}

		if(!jwtRequest && !jwtRequest.hasOwnProperty("saml")) {
			return res.status(400).send("Invalid session JWT");
		}
		
		Audit.add(req, "page", "login", thisPage.name).then(() => {
			if(jwtRequest.jwt) {
				JWT.sign({
					sub: req.user.username,
					aud: thisPage.name,
				}, thisPage.jwt, JWT.age().SHORT).then(jwtData => {
					const returnObj = {
						redirect: thisPage.redirect,
						token: jwtData,
					};
					
					res.status(200).json(returnObj);
				});
			} else if(jwtRequest.hasOwnProperty("saml")) {
				req.query.SAMLRequest = jwtRequest.saml.request;
				req.query.RelayState = jwtRequest.saml.relay;
				
				samlp.parseRequest(req, (err, samlData) => {
					if(!samlData.hasOwnProperty("assertionConsumerServiceURL")) {
						samlData.assertionConsumerServiceURL = thisPage.redirect;
					}
					
					samlp.auth({
						issuer: this.fido2Options.rpName,
						cert: this.serverCrt,
						key: this.serverKey,
						getPostURL: (audience, ream, req, callback) => {
							return callback(null, samlData.assertionConsumerServiceURL);
						},
						getUserFromRequest: (req) => {
							return {
								id: req.user.id,
								displayName: req.user.username,
							};
						},
						responseHandler: (response, opts, req, res, next) => {
							const returnObj = {
								SAMLResponse: response.toString("base64"),
								RelayState: req.query.RelayState,
								redirect: samlData.assertionConsumerServiceURL,
							};
							
							res.status(200).json(returnObj);
						},
						profileMapper: PassportProfileMapper,
					})(req, res, next);
				});
			}
		});
	}

	// SAML
	// Test flow: https://samltest.id/start-idp-test/
	// Test payload: https://localhost/#/in/saml?SAMLRequest=fZLbcqowGEZfhck9iIgKGdFBBDy2KtSt3nQiRA5CQknw0Kcv1e1M977oZZIv%2Bf7MWr3BNc%2BEMy5ZQokBmpIMBEwCGiYkMsCb74gaGPR7DOVZAc2Kx2SNPyrMuFDfIwzeDwxQlQRSxBIGCcoxgzyAnrmYQ0WSYVFSTgOaAcFkDJe8LrIoYVWOSw%2BX5yTAb%2Bu5AWLOCwYbjYxGCZEYyjA70jLAUkBzIIzqyoQgfp%2FyGS0o4zkiIg5i%2Bh27bwy%2BRwLCZGSAd%2BWl7bqFQvKJbzmH4OZ6sxStWijpzK56YF5G8dDdNiNzejtbZTY9U3sVpnbksyNKo4Wed1PpIk1057MZhpt0r2ezvRUHrOCFfrqerOojuBzwC5ay6W2zKoZa4iEVXZwdS3WzXXbX9qE9LcbjrjLsHHFUjR1naWsLdGpVauzZs0x%2F13KabOeh2e7%2B2cSfF6Rtd1ei5iMWe0Vre5CX9n72Ohov%2BDXbbNEtcHfVIrIU2S2Olln%2FkrEKTwjjiHADKHKzJcqqqGi%2BokC1BVVFammdPRCWfxkME%2FIg%2BxuwwyPE4Nj3l%2BLy1fOBsHkaUgfAwwd4Ly9%2FiPD7s%2BhJH%2FSfAFEtlCyG%2BCziUMpv%2F1HvNX7U9B%2BrfyXsfwE%3D&SAMLRelay=saml-relay
	// Create own: https://www.samltool.com/sign_authn.php
	onSamlIn(req, res, next) {
		samlp.parseRequest(req, (err, samlData) => {
			if(err) {
				console.error(err);
				return res.status(400).send("Invalid SAML request");
			}
			
			if(!samlData.destination) {
				return res.status(400).send("Destination parameter missing");
			}
			
			const reqIssuer = samlData.issuer;
			let pageId = false;
			for (let thisPageId of Object.keys(this.customPages)) {
				const thisPage = this.customPages[thisPageId];
				if(thisPage.samlIssuer == reqIssuer) {
					pageId = thisPageId;
					break;
				}
			}
			if(!pageId) {
				return res.status(404).send("No website matches to the requested destination host");
			}
			const thisPage = this.customPages[pageId];
			
			const jwtObj = {
				pageId,
				saml: {
					request: req.query.SAMLRequest,
					relay: req.query.RelayState,
				},
			};
			JWT.sign(jwtObj, this.ownJwtToken, JWT.age().SHORT).then(jwtData => {
				res.status(200).json({
					page: {
						pageId,
						name: thisPage.name,
						branding: thisPage.branding,
						token: jwtData,
						flowType: "saml",
					},
				});
			});
		});
	}

	onSamlMeta(req, res, next) {
		samlp.metadata({
			issuer: this.fido2Options.rpName,
			cert: this.serverCrt,
			profileMapper: PassportProfileMapper,
			endpointPath: "/#/in/saml",
		})(req, res, next);
	}

	// Middleware for SSO Token
	parseSSOHeader(req, res, next) {
		if(!req || !req.headers || !req.headers["x-sso-token"]) return next();
		const ssoToken = req.headers["x-sso-token"];
		
		JWT.verify(ssoToken, this.ownJwtToken, {
			maxAge: JWT.age().MEDIUM,
		}).then(jwtRequest => {
			if(!jwtRequest.pageId) return next();
			req.ssoRequest = jwtRequest;
			next();
		}).catch(err => {
			next();
		});
	}
}

exports.ssoFlow = ssoFlow;