require("dotenv").config();
const https = require("https");
const express = require("express");
const rateLimit = require("express-rate-limit");

const { execFile, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const url = require("url");
const crypto = require("crypto");

const jwt = require("jsonwebtoken"), shortJWTAge = "5m", mediumJWTAge = "1h";
const validator = require("validator");
const pki = require("node-forge").pki;

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

const customPages = require("./websites.json");

// Custom classes
const {DB, User, PwUtil, Audit, Mailer} = require("./utils");

const expressPort = process.env.BACKENDPORT || 3000;
const frontendPort = process.env.FRONTENDPORT || 8080;
const hostname = process.env.DOMAIN || "localhost";
const disableLocalhostPatching = process.env.DISABLELOCALHOSTPATCHING || false;
const emailFrom = process.env.SMTPUSER || process.env.FALLBACKEMAILFROM;

// Configure Fido2
if(hostname == "localhost" && !disableLocalhostPatching) {
	const packageList = require("./package.json");
	
	const utilsLocation = require.resolve("fido2-lib/lib/utils.js");
	if(packageList.dependencies["fido2-lib"] == "^2.1.1" && fs.statSync(utilsLocation).size == 7054) {
		// FIDO2-Lib does not natively support localhost and due to little maintenance this issue hasn't been fixed yet. See https://github.com/apowers313/fido2-lib/pull/19/files
		// To increase usability, this script automatically patches this library if you want to use localhost
		console.warn("Localhost was detected for FIDO2 library - patching fido2-lib now!");
		
		const oldContent = fs.readFileSync(utilsLocation, {encoding: "UTF-8"});
		fs.writeFileSync(utilsLocation, oldContent.replace('if (originUrl.protocol !== "https:") {', 'if (originUrl.protocol !== "https:" && originUrl.hostname !== "localhost") {'));
	}
}

const base64url = require("base64-arraybuffer");
const { Fido2Lib } = require("fido2-lib");
const fido2Options = {
	protocol: "https",
	rpId: hostname,
	rpName: process.env.ISSUERNAME || "OWASP SSO",
	attestation: "none",
	factor: process.env.FIDO2FACTOR || "either",
	timeout: parseInt(process.env.FIDO2TIMEOUT) || 15*60,
	protocol: "https",
	origin: frontendPort==443 ? "https://" + hostname : "https://" + hostname + ":" + frontendPort,
};
const f2l = new Fido2Lib(fido2Options);

// Entrypoint
const app = express();
let ownJwtToken = null;

// Create keys if they don't exist (not mounted/first start)
const keyPath = "keys";
if(!fs.existsSync(keyPath+"/server_key.pem")) {
	const createServerCert = execFileSync("bash", [
		"-c", "scripts/setup.bash '"+fido2Options.rpName+"'",
	]);
	console.log("Server keys have been generated", createServerCert);
}

let serverInstance, caMap = {};
const serverKey = fs.readFileSync(keyPath+"/server_key.pem");
const serverCrt = fs.readFileSync(keyPath+"/server_cert.pem");
PwUtil.createRandomString(30).then(tempJwtToken => {
	ownJwtToken = tempJwtToken;
	if(hostname == "localhost") ownJwtToken = "hello-world";
	
	// Rate limitation middleware
	app.set("trust proxy", "loopback, 172.16.0.0/12");
	app.use(rateLimit({
		// Generic limiter
		windowMs: 5 * 60 * 1000,
		max: 500,
		message: "Too many generic requests, please try again later.",
		headers: false,
	}));
	
	// Security headers
	app.disable("x-powered-by");
	app.use((req, res, next) => {
		// Security headers
		res.removeHeader("X-Powered-By");
		
		res.set({
			"X-Content-Type-Options": "nosniff",
			"Referrer-Policy": "strict-origin",
			"Feature-Policy": "default 'none'",
			"Content-Security-Policy": "default 'none'",
			"X-XSS-Protection": "1; mode=block",
		});
		
		if(hostname != "localhost") {
			res.set({
				"Strict-Transport-Security": "Strict-Transport-Security: max-age=31536000",
				"X-Frame-Options": "SAMEORIGIN",
			});
		} else {
			res.set({
				"Access-Control-Allow-Origin": "https://"+hostname+":"+frontendPort,
				"Access-Control-Allow-Headers": "content-type, authorization, x-sso-token",
				"Access-Control-Allow-Methods": "GET, POST",
			});
		}
		
		next();
	});
	
	// Parser middleware
	app.use(require("body-parser").urlencoded({ extended: true }));
	app.use(express.json());
	app.use(parseAuthHeader);
	app.use(parseSSOHeader);
	
	// -- Endpoints
	// General
	/*app.get("/logout", (req, res, next) => {
		if(req.user && req.user.token) {
			User.deleteSession(req.user.token).then(() => {})
		}
		
		next()
	}, showSuccess)*/
	app.get("/me", isLoggedIn, (req, res) => {
		User.findUserById(req.user.id).then(userData => {
			const {password, last_login, created, ...publicAttributes} = userData;
			publicAttributes.authenticators.forEach(v => {
				delete v.userCounter;
				delete v.userKey;
			});
			const token = req.user.token;
			
			if(token) {
				User.validateSession(token).then(() => {
					publicAttributes.isAuthenticated = true;
					res.json(publicAttributes);
				});
			} else {
				publicAttributes.isAuthenticated = false;
				res.json(publicAttributes);
			}
		});
	});
	app.get("/audit", isAuthenticated, (req, res) => {
		const currentPage = parseInt(req.query.page) || 0;
		const pageSize = process.env.AUDITPAGELENGTH || 5;
		
		Audit.get(req.user.id, currentPage*pageSize, pageSize).then(results => {
			res.json(results);
		}).catch(err => {
			res.status(500).send(err);
		});
	});
	app.post("/authenticator/delete", isAuthenticated, (req, res, next) => {
		Audit.add(req.user.id, getIP(req), "authenticator", "remove", req.body.handle).then(aID => {
			User.removeAuthenticator(req.body.type, req.user.id, req.body.handle).then(() => {
				next();
			}).catch(err => {
				res.status(400).send(err);
			});
		}).catch(err => {
			res.status(500).send(err);
		});
	}, showSuccess);
	app.get("/email-confirm", onEmailConfirm, createAuthToken);
	
	// JWT flow
	app.route("/flow/in").get(onFlowIn, showSuccess).post(onFlowIn, showSuccess);
	app.post("/flow/out", isAuthenticated, onFlowOut, showSuccess);
	
	// SAML
	// Test flow: https://samltest.id/start-idp-test/
	
	// Test payload: https://localhost:8080/#/in/saml?SAMLRequest=fZJbc6owFIX%2FCpN3EAEVMmIHEfDaqlCP%2BtKJELkUEkqCl%2F76Uj3O9JyHPmay9l4r%2BVb%2F6VLkwglXLKXEBG1JBgImIY1SEpvgNXBFHTwN%2BgwVeQmtmidkjT9qzLjQzBEGbxcmqCsCKWIpgwQVmEEeQt9azKEiybCsKKchzYFgMYYr3hjZlLC6wJWPq1Ma4tf13AQJ5yWDrVZO45RIDOWYHWkVYimkBRBGjWVKEL%2BlfEhDSjhlVEJNLvlb1%2FqOA4TJyARvynPH80qFFJPAdg%2Fh1fNnGVqpKO3OLkZonUfJ0Nu2Y2t6PdlVPj1RZxVlThywI8rihVH0MuksTQz3sx1Fm2xv5LO9nYSs5KXxfnm364%2FwfMDPWMqn182qHOqpjzR0dncsM6xO1Vs7h860HI97yrB7xHE9dt2loy%2FQu1prie%2FMcuNNL2i6nUdWp%2Fdnk3yekb7dXYhWjFjil%2Br2IC%2Bd%2FexlNF7wS77Zomvo7epFbCuyVx5tq3klYzWeEMYR4SZQ5LYqypqo6IGiQE2FmiKpencPhOXf%2Fx%2Bm5E71N1iHu4jBcRAsxeWLHwBh82hHIwD3LsCbefWjBL%2BvRQ%2FyYPCAd4MmRvgk4kgqrv8R77d%2B2Azup38LOPgC&RelayState=123
	// Create own: https://www.samltool.com/sign_authn.php
	app.get("/saml", (req, res, next) => {
		samlp.parseRequest(req, (err, samlData) => {
			if(hostname == "localhost") {
				samlData.destination = customPages["1"].redirect;
			}
			
			if(err) {
				console.error(err);
				return res.status(400).send("Invalid SAML request");
			}
			
			if(!samlData.destination) {
				return res.status(400).send("Destination parameter missing");
			}
			
			const issUrl = url.parse(samlData.destination);
			let pageId = false;
			for (let thisPageId of Object.keys(customPages)) {
				const thisPage = customPages[thisPageId];
				// Question for the future - what happens if two pages have the same hostname? Eg one company wants to have two pages redirect to the same destination.
				// I don't see a good way to identify the source website more uniquely in SAML standard requests
				// The ID would be possible but appears to be used for other purposes
				if(url.parse(thisPage.redirect).hostname == issUrl.hostname) {
					pageId = thisPageId;
					break;
				}
			}
			if(!pageId) {
				return res.status(404).send("No website matches to the requested destination host");
			}
			const thisPage = customPages[pageId];
			
			const jwtObj = {
				aud: hostname,
				iss: hostname,
				pageId,
				saml: {
					request: req.query.SAMLRequest,
					relay: req.query.RelayState,
				},
			};
			jwt.sign(jwtObj, ownJwtToken, {
				expiresIn: mediumJWTAge,
			}, (err, jwtData) => {
				if(err) return res.status(500).send(err.message);
				
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
	});
	app.get("/saml/FederationMetadata/2007-06/FederationMetadata.xml", samlp.metadata({
		issuer: fido2Options.rpName,
		cert: serverCrt,
		profileMapper: PassportProfileMapper,
	}));
	
	// Registration
	app.post("/local/register", rateLimit({
		windowMs: 1 * 60 * 1000,
		max: 5,
		message: "Too many registration requests, please try again later.",
		headers: false,
	}), antiTiming, onRegister, showSuccess);
	app.post("/local/activate", onActivate, (req, res, next) => {
		User.addUser(req.body.username, req.body.password).then(userId => {
			req.user = {id: userId}; // skip 2fa
			next();
		});
	}, createAuthToken);
	app.post("/local/change-request", rateLimit({
		windowMs: 1 * 60 * 1000,
		max: 5,
		message: "Too many change requests, please try again later.",
		headers: false,
	}), antiTiming, onChangeRequest, showSuccess);
	app.post("/local/change", onChange, createAuthToken);
	app.post("/local/session-clean", isAuthenticated, (req, res, next) => {
		const token = req.user.token;
		Audit.add(req.user.id, getIP(req), "session", "clean", null).then(() => {
			User.cleanSession(req.user.id, token).then(() => {
				next();
			}).catch(err => {
				res.status(400).send(err);
			});
		});
	}, showSuccess);
	
	// Local auth
	app.post("/local/login", rateLimit({
		windowMs: 5 * 60 * 1000,
		max: 20,
		message: "Too many login requests, please try again later.",
		headers: false,
	}), antiTiming, (req, res, next) => {
		User.findUserByName(req.body.username).then(user => {
			req.user = {id: user.id}; // not skipping login, just for audit later
			
			if(!user.password) {
				res.status(404).send("User has no password set");
			} else {
				return PwUtil.verifyPassword(req.body.password, user.password);
			}
		}).then(result => {
			if(result === true) {
				return User.updateLoginTime(req.user.id);
			} else {
				throw "Wrong password";
			}
		}).catch(err => {
			console.error(err);
			res.status(404).send("No user with this username/password combination found");
		}).then(() => {
			return Audit.add(req.user.id, getIP(req), "login", "password", null);
		}).then(() => {
			req.loginEmail = req.body.username;
			next();
		}).catch(err => {
			//console.error(err)
			res.status(500).send("Internal error during login");
		});
	}, createLoginToken);
	app.get("/local/email-auth", rateLimit({
		windowMs: 5 * 60 * 1000,
		max: 5,
		message: "Too many email authentication requests, please try again later.",
		headers: false,
	}), isLoggedIn, (req, res, next) => {
		const email = req.user.username;
		
		User.requestEmailActivation(email, getIP(req), "login").then(token => {
			Mailer.sendMail({
				from: "OWASP Single Sign-On <"+emailFrom+">",
				to: email,
				subject: "Log into OWASP Single Sign-On",
				html: "To confirm your login click on https://" + hostname + "/#/two-factor/"+token,
				text: "To confirm your login click on https://" + hostname + "/#/two-factor/"+token,
			}, err => {
				if(err) return res.status(500).send(err.message);
				next();
			});
		}).catch(err => {
			console.error(err);
			res.status(400).send("Something went wrong");
		});
	}, showSuccess);
	
	// FIDO2
	app.get("/fido2/register", isAuthenticated, (req, res, next) => {
		const userId = req.user.id;
		f2l.attestationOptions().then(regOptions => {
			regOptions.user.id = base64url.encode(str2ab(userId));
			regOptions.challenge = base64url.encode(regOptions.challenge);
			
			jwt.sign({
				sub: userId,
				aud: hostname,
				iss: hostname,
				challenge: regOptions.challenge,
			}, ownJwtToken, {
				expiresIn: shortJWTAge,
			}, (err, jwtData) => {
				if(err) return res.status(500).send(err.message);
				
				return res.status(200).json({
					"token": jwtData,
					"options": regOptions,
				});
			});
		}).catch(err => {
			console.error(err);
			return res.status(500).send("Attestation generation failed");
		});
	});
	app.post("/fido2/register", isAuthenticated, checkLabel, (req, res, next) => {
		const userId = req.user.id;
		const regResponse = req.body.response;
		const label = req.body.label;
		
		let regToken;
		try {
			regToken = jwt.verify(req.body.token, ownJwtToken, {
				maxAge: shortJWTAge,
				audience: hostname,
				subject: userId,
				issuer: hostname,
			});
		} catch(err) {
			//console.error(err)
			return res.status(400).send(err.message);
		}
		const challenge = regToken.challenge;
		regResponse.rawId = base64url.decode(regResponse.rawId);
		
		const attestationExpectations = {
			challenge: challenge,
			origin: fido2Options.origin,
			factor: fido2Options.factor,
		};
		
		f2l.attestationResult(regResponse, attestationExpectations).then(regResult => {
			const authnrData = regResult.authnrData;
			const credId = base64url.encode(authnrData.get("credId"));
			req.fido2 = {
				counter: authnrData.get("counter"),
				credentialId: credId,
				publicKey: authnrData.get("credentialPublicKeyPem"),
			};
			
			return Audit.add(userId, getIP(req), "authenticator", "add", label + " ("+credId+")");
			
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
	}, showSuccess);
	app.get("/fido2/login", isLoggedIn, (req, res, next) => {
		const userId = req.user.id;
		
		Promise.all([
			f2l.assertionOptions(),
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
			
			jwt.sign({
				sub: userId,
				aud: hostname,
				iss: hostname,
				challenge: logOptions.challenge,
			}, ownJwtToken, {
				expiresIn: shortJWTAge,
			}, (err, jwtData) => {
				if(err) return res.status(500).send(err.message);
				
				return res.status(200).json({
					"token": jwtData,
					"options": logOptions,
				});
			});
		}).catch(err => {
			console.error(err);
			return res.status(500).send("Assertation generation failed");
		});
	});
	app.post("/fido2/login", isLoggedIn, (req, res, next) => {
		const userId = req.user.id;
		const logResponse = req.body.response;
		let jwtToken;
		try {
			jwtToken = jwt.verify(req.body.token, ownJwtToken, {
				maxAge: shortJWTAge,
				audience: hostname,
				subject: userId,
				issuer: hostname,
			});
		} catch(err) {
			//console.error(err)
			return res.status(400).send(err.message);
		}
		const challenge = jwtToken.challenge;
		
		let thisCred;
		User.findUserById(userId).then(user => {
			const credList = user.authenticators;
			const credListFiltered = credList.filter(x => x.userHandle == logResponse.rawId);
			
			if(!credListFiltered.length) return res.status(404).send("Authenticator does not exist");
			thisCred = credListFiltered.pop();
			logResponse.rawId = base64url.decode(logResponse.rawId);
			logResponse.response.authenticatorData = base64url.decode(logResponse.response.authenticatorData);
			
			const assertionExpectations = {
				challenge: challenge,
				origin: fido2Options.origin,
				factor: fido2Options.factor,
				publicKey: thisCred.userKey,
				prevCounter: thisCred.userCounter,
				userHandle: thisCred.userHandle,
			};
			
			return f2l.assertionResult(logResponse, assertionExpectations);
		}).then(logResult => {
			const returnObj = {
				counter: logResult.authnrData.get("counter"),
				flags: logResult.authnrData.get("flags"),
			};
			return Promise.all([
				User.updateAuthenticatorCounter("fido2", thisCred.userHandle, returnObj.counter),
				Audit.add(userId, getIP(req), "authenticator", "login", thisCred.label + " (" + thisCred.userHandle + ")"),
			]);
		}).then(() => {
			next();
		}).catch(err => {
			return res.status(400).send(err.message);
		});
	}, createAuthToken);
	
	// Client certificate
	app.post("/cert/login", rateLimit({
		windowMs: 5 * 60 * 1000,
		max: 50,
		message: "Too many certificate login requests, please try again later.",
		headers: false,
	}), isLoggedInBridge, onCertLogin, createAuthToken);
	app.post("/cert/register", isAuthenticated, checkLabel, onCertRegister);
	
	// Start webserver
	if(hostname == "localhost") {
		console.log("Starting API webserver on https://localhost:"+expressPort);
	} else {
		console.log("Starting API webserver for production via internal port "+expressPort);
	}
	
	const caList = [serverCrt];
	caMap["native"] = pki.createCaStore([ serverCrt.toString() ]);
	const caFolder = keyPath+"/ca";
	const caFiles = fs.readdirSync(caFolder);
	caFiles.forEach(caFile => {
		const readCa = fs.readFileSync(caFolder+"/"+caFile);
		caMap[caFile] = pki.createCaStore([ readCa.toString() ]);
		caList.push(readCa);
	});
	console.log(caList.length + " CA loaded");
	bundleCAs(caList);
	
	const httpsOpts = {
		key: serverKey,
		cert: serverCrt,
		requestCert: true,
		rejectUnauthorized: false,
		ca: caList,
	};
	serverInstance = https.createServer(httpsOpts, app).listen(expressPort);
});

// The nginx project requires a single PEM file for all CAs to be used for client certificates
// As this application generates and refreshes it, it makes most sense to bundle them here and mount the file to the other host
// This also protects against the typical issues of mounting volumes if files still exist
// It gets called after loading the files from the constructor anyways and will monitor if new CAs pop up
function bundleCAs(caList) {
	fs.writeFile(keyPath+"/bundled-ca.pem", caList.join(""), "utf8", err => {
		if(err) {
			console.error("Writing bundled CA failed", err);
		}
	});
	
	const numInitialCustomCAs = caList.length - 1;
	setInterval(() => {
		// Monitor for new CAs
		const numCurrentCustomCAs = fs.readdirSync(keyPath+"/ca").length;
		if(numCurrentCustomCAs != numInitialCustomCAs) {
			console.warn("Number of custom CAs has changed from", numInitialCustomCAs, "to", numCurrentCustomCAs);
			// Exit application for automated restart, loading new CAs
			
			require("process").exit(205);
		}
	}, 15 * 60 * 1000);
}

// Flow to be redone - cant do redirects etc, but should instead just offer data about specific page IDs, which are managed by the client
// Then for the flow out, the client just requests an "outgoing" token for a page
// Test eg via http://jwtbuilder.jamiekurtz.com/
function onFlowIn(req, res, next) {
	const dataIn = req.query.d || req.body.d;
	const pageId = req.query.id || req.body.id;
	if(!pageId || isNaN(pageId)) {
		return res.status(400).send("Invalid flow request - missing parameters");
	} else if(!customPages.hasOwnProperty(pageId)) {
		return res.status(404).send("Website ID not found");
	}
	
	const thisPage = customPages[pageId];
	let jwtInput;
	
	if(!dataIn && thisPage.signedRequestsOnly) {
		return res.status(403).send("This website is configured to only allow signed login requests");
	}
	if(dataIn) {
		try {
			jwtInput = jwt.verify(dataIn, thisPage.jwt, {
				maxAge: shortJWTAge,
				audience: hostname,
				issuer: thisPage.name,
			});
		} catch(err) {
			//console.error(err)
			return res.status(403).send(err.name + ": " + err.message);
		}
	}
	//console.log("jwtInput", jwtInput)
	
	const jwtObj = {
		aud: hostname,
		iss: hostname,
		pageId,
		jwt: true,
	};
	if(jwtInput && jwtInput.hasOwnProperty("sub")) {
		jwtObj.sub = jwtInput.sub;
	}
	jwt.sign(jwtObj, ownJwtToken, {
		expiresIn: mediumJWTAge,
	}, (err, jwtData) => {
		if(err) return res.status(500).send(err.message);
		
		req.returnExtra = {
			page: {
				pageId,
				name: thisPage.name,
				branding: thisPage.branding,
				token: jwtData,
				flowType: "jwt",
			},
		};
		
		if(jwtInput && jwtInput.hasOwnProperty("sub")) {
			if(!validator.isEmail(jwtInput.sub+"")) {
				return res.status(400).send("Subject is not a valid email address");
			}
			
			const email = jwtInput.sub;
			req.returnExtra.page.username = email;
			User.findUserByName(email).then(userData => {
				req.loginEmail = email;
				req.user = userData;
				return Audit.add(req.user.id, getIP(req), "page", "request", thisPage.name);
			}).then(() => {
				// Artificially log in as this user
				createLoginToken(req, res, next);
			}).catch(err => {
				console.error(err);
				
				// User does not exist - register
				User.addUser(email, null).then(userId => {
					return User.findUserById(userId);
				}).then(userData => {
					req.loginEmail = email;
					req.user = userData;
					
					return Audit.add(req.user.id, getIP(req), "page", "registration", thisPage.name);
				}).then(() => {
					createLoginToken(req, res, next);
				}).catch(err => {
					console.error(err);
					res.status(500).send("Creating user automatically failed");
				});
			});
		} else {
			res.status(200).json(req.returnExtra);
		}
	});
}

function onFlowOut(req, res, next) {
	const jwtRequest = req.ssoRequest;
	const pageId = jwtRequest.pageId;
	const thisPage = customPages[pageId];
	
	if(jwtRequest.hasOwnProperty("sub")) {
		if(req.user.username.toLowerCase() != jwtRequest.sub.toLowerCase()) {
			return res.status(403).send("The website needs you to be explicitly signed into the account it requested");
		}
	}

	if(!jwtRequest && !jwtRequest.hasOwnProperty("saml")) {
		return res.status(400).send("Invalid session JWT");
	}
	
	Audit.add(req.user.id, getIP(req), "page", "login", thisPage.name).then(() => {
		if(jwtRequest.jwt) {
			jwt.sign({
				sub: req.user.username,
				aud: thisPage.name,
				iss: hostname,
			}, thisPage.jwt, {
				expiresIn: shortJWTAge,
			}, (err, jwtData) => {
				Audit.add(req.user.id, getIP(req), "page", "login", thisPage.name).then(() => {
					const returnObj = {
						redirect: thisPage.redirect,
						token: jwtData,
					};
					
					res.status(200).json(returnObj);
				});
			});
		} else if(jwtRequest.hasOwnProperty("saml")) {
			req.query.SAMLRequest = jwtRequest.saml.request;
			req.query.RelayState = jwtRequest.saml.relay;
			
			samlp.parseRequest(req, (err, samlData) => {
				samlp.auth({
					issuer: fido2Options.rpName,
					cert: serverCrt,
					key: serverKey,
					getPostURL: (audience, ream, req, callback) => {
						return callback(null, samlData.destination);
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
							redirect: samlData.destination,
						};
						
						res.status(200).json(returnObj);
					},
					profileMapper: PassportProfileMapper,
				})(req, res, next);
			});
		}
	});
}

// Client certificate is not used via REST normally, so we need a bridge for a POST request
function isLoggedInBridge(req, res, next) {
	if(!req.user || !req.user.id) {
		let passBridge = false;
		const authorizationBridge = req.body.authorizationToken;
		
		if(authorizationBridge) {
			checkAuthToken(authorizationBridge).then(authentication => {
				req.user = authentication;
				next();
			}).catch(() => {
				return res.status(403).send("You need to be signed in 1");
			});
		} else {
			return res.status(403).send("You need to be signed in 2");
		}
	}
}

function onCertLogin(req, res, next) {
	let cert = req.connection.getPeerCertificate(true);
	//console.log("cert login", cert, req.user)
	
	if(!cert.subject) {
		console.log("no subject", req.headers["x-tls-verified"]);
		
		// No direct connection - check header value
		if(req.headers.hasOwnProperty("x-tls-verified") && req.headers["x-tls-verified"] == "SUCCESS") {
			//console.log("receive certificate via proxy", req.headers["x-tls-cert"]);
			const rawCert = decodeURIComponent(req.headers["x-tls-cert"]);
			
			const rawCertParsed = pki.certificateFromPem(rawCert);
			
			const rawCertB64 = rawCert.match(/-----BEGIN CERTIFICATE-----\s*([\s\S]+?)\s*-----END CERTIFICATE-----/i);
			if(!rawCertB64) return res.status(400).send("Certificate can't be parsed");
			const rawCertBinary = Buffer.from(rawCertB64[1], "base64");
			const sha256sum = crypto.createHash("sha256").update(rawCertBinary).digest("hex");
			
			cert = {
				raw: rawCertBinary,
				valid_from: rawCertParsed.validity.notBefore,
				valid_to: rawCertParsed.validity.notAfter,
				fingerprint256: sha256sum.toUpperCase().replace(/(.{2})(?!$)/g, "$1:"),
				subject: {
					emailAddress: rawCertParsed.subject.getField("E").value,
					CN: rawCertParsed.subject.getField("CN").value,
				},
			};
			
			//console.log("parsed cert", rawCert, rawCertParsed, rawCertParsed.issuer.attributes, rawCertParsed.subject.attributes, cert);
		} else {
			return res.status(403).send("Certificate required");
		}
	} else {
		cert = {
			raw: cert.raw,
			valid_from: cert.valid_from,
			valid_to: cert.valid_to,
			fingerprint256: cert.fingerprint256,
			subject: {
				emailAddress: (cert.subject.emailAddress ? cert.subject.emailAddress : null),
				CN: cert.subject.CN,
			},
		};
	}
	
	/*const valid_from = new Date(cert.valid_from);
	const valid_to = new Date(cert.valid_to);
	const isValid = Date.now() > valid_from && Date.now() < valid_to;
	if(!isValid) {
		return res.status(403).send("Certificate expired, please create a new one");
	}*/
	
	const certMail = cert.subject.emailAddress;
	if(certMail && certMail.toLowerCase() != req.user.username.toLowerCase()) {
		return res.status(403).send("Certificate is designated for another email address");
	}
	
	const certPem = "-----BEGIN CERTIFICATE-----\n" + (cert.raw.toString("base64").match(/.{0,64}/g).join("\n")) + "-----END CERTIFICATE-----";
	//console.log("cert pem", certPem);
	const forgeCert = pki.certificateFromPem(certPem);
	
	if(req.body.token) {
		// If a token is provided, we first check if its a custom CA
		// While the post request itself later on is async, the basic checks are sync and should be fine
		let jwtRequest;
		try {
			jwtRequest = jwt.verify(req.body.token, ownJwtToken, {
				issuer: hostname,
				audience: hostname,
				maxAge: mediumJWTAge,
			});
		} catch(err) {
			//console.error(err);
			return res.status(400).send(err.message);
		}
		
		const pageId = jwtRequest.pageId;
		const thisPage = customPages[pageId];
		
		if(thisPage.hasOwnProperty("certificates")) {
			for (let certHandler of thisPage.certificates) {
				for (let authorityFile of certHandler.authorities) {
					try {
						pki.verifyCertificateChain(caMap[authorityFile], [ forgeCert ]);
					} catch (e) {
						continue;
					}
					
					if(!certHandler.webhook || !certHandler.webhook.url) {
						return Audit.add(req.user.id, getIP(req), "authenticator", "login", thisPage.name + " certificate").then(() => {
							next();
						}).catch(err => {
							console.error(err);
						});
					} else {
						return PwUtil.httpPost(certHandler.webhook.url, JSON.stringify({
							certificate: cert,
							username: req.user.username,
						})).then(response => {
							let passCertificate = false;
							if(certHandler.webhook.successContains) {
								passCertificate = (response.indexOf(certHandler.webhook.successContains) != -1);
							} else if(certHandler.webhook.successRegex) {
								passCertificate = response.test(certHandler.webhook.successRegex);
							} else {
								passCertificate = true;
							}
							if(!passCertificate) {
								return res.status(403).send("Certificate denied by page");
							} else {
								Audit.add(req.user.id, getIP(req), "authenticator", "login", thisPage.name + " certificate").then(() => {
									next();
								}).catch(err => {
									console.error(err);
								});
							}
						});
					}
				}
			}
		}
	}
	
	// Now check if it matches the native CA
	try {
		pki.verifyCertificateChain(caMap["native"], [ forgeCert ]);
	} catch (err) {
		console.error(err);
		return res.status(403).send("Certificate rejected");
	}
	
	// Verify fingerprint matches account
	return User.findAuthenticatorByUser(req.user.id).then(authenticators => {
		const fingerprints = {};
		for(let i=0;i<authenticators.length;i++) {
			const authenticator = authenticators[i];
			
			if(authenticator.type != "cert") continue;
			fingerprints[authenticator.userHandle] = authenticator;
		}
		
		//console.log("allowed fingerprints", fingerprints)
		if(cert.fingerprint256 in fingerprints) {
			const thisCert = fingerprints[cert.fingerprint256];
			Audit.add(req.user.id, getIP(req), "authenticator", "login", thisCert.label + " (" + cert.fingerprint256 + ")").then(() => {
				next();
			});
		} else {
			// It's either a custom CA or from a different user
			return res.status(403).send("Certificate is not associated with this account");
		}
	}).catch(err => {
		console.error(err);
		return res.status(500).send("Cant get authenticator");
	});
}

function onEmailConfirm(req, res, next) {
	// Inbound email verification
	const token = req.query.token;
	const action = req.query.action;
	
	Audit.add(req.user ? req.user.id : null, getIP(req), action, "email", null).then(aID => {
		switch(action) {
			default:
				return res.status(400).send("Invalid action");
			case "registration":
				return res.redirect(303, "/registration-finish.html?" + token);
			case "change":
				return res.redirect(303, "/password-change.html?" + token);
			case "login":
				return User.resolveEmailActivation(token, getIP(req), action).then(confirmation => {
					next();
				}).catch(err => {
					res.status(400).send(err);
				});
		}
	}).catch(err => {
		res.status(500).send(err);
	});
}

function onRegister(req, res, next) {
	const email = req.body.email;
	
	User.requestEmailActivation(email, getIP(req), "registration").then(token => {
		Mailer.sendMail({
			from: "OWASP Single Sign-On <"+emailFrom+">",
			to: email,
			subject: "Confirm your email address",
			html: "To confirm your email click on https://" + hostname + "/#/register/"+token,
			text: "To confirm your email click on https://" + hostname + "/#/register/"+token,
		}, err => {
			if(err) return res.status(500).send(err.message);
			
			next();
		});
	}).catch(err => {
		res.status(400).send(err);
	});
}

function checkLabel(req, res, next) {
	const label = req.body.label;
	if(!label || label.length > 25 || label.match(/[^\w \-]/)) {
		return res.status(400).send("Invalid label name");
	}
	next();
}

function onCertRegister(req, res, next) {
	const email = req.user.username;
	const label = req.body.label;
	
	// On Windows you can use bash.exe delivered with Git and add it to your PATH environment variable
	execFile("bash", [
		"-c", "scripts/create-client.bash '"+email+"' '"+email+"'",
	], {}, (err, stdout, stderr) => {
		if(err || stderr) {
			console.error("cert creation", err, stderr);
			return res.status(500).send("Cant create certificate");
		} else {
			const certData = JSON.parse(stdout.trim());
			const certPath = path.resolve(certData.file);
			const certFolder = path.dirname(certPath);
			const ctrlFolder = path.resolve("./tmp");
			
			if(certFolder != ctrlFolder) {
				console.error("certPath rejected", certPath, certFolder, ctrlFolder);
				return res.status(500).send("Internal error");
			}
			
			Audit.add(req.user.id, getIP(req), "authenticator", "add", label+" ("+certData.fingerprint256+")").then(() => {
				res.download(certPath, "client-certificate.p12", async err => {
					//console.log("res.download", err)
					fs.unlink(certPath, err => {
						//console.log("unlink", certPath)
					});
					
					return User.addAuthenticator("cert", email, label, {
						userCounter: null,
						userHandle: certData.fingerprint256,
						userKey: null,
					});
				});
			}).catch(err => {
				console.error(err);
				return res.status(500).send("Error during creation");
			});
		}
		//console.log("execFile", err, stdout, stderr)
	});
}

function onChangeRequest(req, res, next) {
	const email = req.body.email;
	
	User.requestEmailActivation(email, getIP(req), "change").then(token => {
		Mailer.sendMail({
			from: "OWASP Single Sign-On <"+emailFrom+">",
			to: email,
			subject: "Change your password",
			html: "To change your password click on https://" + hostname + "/#/change-password/"+token,
			text: "To change your password click on https://" + hostname + "/#/change-password/"+token,
		}, err => {
			if(err) return res.status(500).send(err.message);
			next();
		});
	}).catch(err => {
		if(hostname=="localhost") {
			res.status(400).send(err);
		} else {
			next();
		}
	});
}

// Protection against timing attacks
function antiTiming(req, res, next) {
	crypto.randomBytes(4, function(ex, buf) {
		var hex = buf.toString("hex");
		var randInt = parseInt(hex, 16);

		setTimeout(() => {
			next();
		}, randInt % 1500);
	});
}

function onActivate(req, res, next) {
	const token = req.body.token;
	const password = req.body.password;
	
	PwUtil.checkPassword(null, password).then(() => {
		return User.resolveEmailActivation(token, getIP(req), "registration");
	}).then(confirmation => {
		req.body.username = confirmation.username;
		req.body.password = password;
		
		next();
	}).catch(err => {
		res.status(400).send(err);
	});
}

function onChange(req, res, next) {
	const token = req.body.token;
	const password = req.body.password;
	
	let confirmation;
	let userId;
	User.resolveEmailActivation(token, getIP(req), "change", true).then(confirmed => {
		confirmation = confirmed;
		return User.findUserByName(confirmation.username);
	}).then(userData => {
		userId = userData.id;
		return PwUtil.checkPassword(userId, password);
	}).then(() => {
		User.manualInvalidateToken(confirmation.id).then(() => {
			return User.changePassword(userId, password);
		}).then(() => {
			req.user = {id: userId};
			
			next();
		}).catch(err => {
			console.error(err);
			res.status(500).send(err);
		});
	}).catch(err => {
		console.error(err);
		res.status(400).send(err);
	});
}

function getIP(req) {
	return req.headers["x-forwarded-for"] || req.connection.remoteAddress;
}

function str2ab(str) {
	const enc = new TextEncoder();
	return enc.encode(str);
}

// Middleware for Authorization header
function parseAuthHeader(req, res, next) {
	if(!req || !req.headers || !req.headers.authorization) return next();
	const authHeader = req.headers.authorization;
	if(authHeader.indexOf(" ") == -1) return next();
	
	const headerParts = authHeader.split(" ");
	if(headerParts[0] != "Bearer") return next();
	
	checkAuthToken(headerParts[1]).then(authentication => {
		req.user = authentication;
		next();
	}).catch(() => {
		next();
	});
}

// Middleware for SSO Token
function parseSSOHeader(req, res, next) {
	if(!req || !req.headers || !req.headers["x-sso-token"]) return next();
	const ssoToken = req.headers["x-sso-token"];
	
	let jwtRequest;
	try {
		jwtRequest = jwt.verify(ssoToken, ownJwtToken, {
			issuer: hostname,
			audience: hostname,
			maxAge: mediumJWTAge,
		});
	} catch(error) {
		//console.error(error);
		return next();
	}
	
	if(!jwtRequest.pageId) return next();
	req.ssoRequest = jwtRequest;
	next();
}

function checkAuthToken(token) {
	return new Promise((resolve, reject) => {
		let authentication;
		try {
			authentication = jwt.verify(token, ownJwtToken, {
				issuer: hostname,
				audience: hostname,
				maxAge: "1y",
			});
			resolve(authentication);
		} catch(error) {
			console.error(error);
			//return res.status(403).send(err.name + ": " + err.message)
			return reject(error);
		}
	});
}

// Is the user just logged in (first factor)?
function isLoggedIn(req, res, next) {
	if(req.user && req.user.id) {
		next();
	} else {
		res.status(403).send("You need to be signed in");
	}
}

// Is the user device authenticated (via 2FA)?
function isAuthenticated(req, res, next) {
	if(!req.user) return res.status(403).send("User not logged in");
	if(!req.user.token) return res.status(403).send("Authorization token missing");
	
	User.validateSession(req.user.token).then(session => {
		if(req.user.id == session.userId) {
			next();
		} else {
			User.deleteSession(req.user.token).then(() => {
				res.status(400).send("Token mismatch");
			});
		}
	}).catch(err => {
		res.status(400).send(err);
	});
}

function showSuccess(req, res) {
	return res.status(200).send("success");
}

function listDomainsForHost(hostname) {
	const resultDomains = [];
	const hostnameSplit = parts.hostname.split(".");
	
	hostnameSplit.forEach((chunk, i) => {
		if(i == hostnameSplit.length-1) return resultDomains;
		resultDomains.push(hostnameSplit.slice(i).join("."));
	});
	
	return null;
}

function createLoginToken(req, res, next) {
	const email = req.loginEmail;
	
	User.findUserByName(email).then(user => {
		jwt.sign({
			sub: user.id,
			aud: hostname,
			iss: hostname,
			id: user.id,
			username: email,
		}, ownJwtToken, {
			expiresIn: mediumJWTAge,
		}, (err, jwtData) => {
			if(err) return res.status(500).send(err.message);
			
			let returnObj = {
				"token": jwtData,
				"username": email,
				"factor": 1,
			};
			if(req.returnExtra) {
				returnObj = Object.assign(returnObj, req.returnExtra);
			}
			
			return res.status(200).json(returnObj);
		});
	}).catch(err => {
		res.status(400).send(err.message);
	});
}

function createAuthToken(req, res, next) {
	if(!req.user.id) {
		return res.status(403).send("User needs to be logged in to finish authentication");
	}
	
	Promise.all([
		User.createSession(req.user.id),
		User.findUserById(req.user.id),
	]).then(values => {
		const {password, last_login, created, ...publicAttributes} = values[1];
		publicAttributes.sub = req.user.id;
		publicAttributes.aud = hostname;
		publicAttributes.iss = hostname;
		publicAttributes.token = values[0];
		publicAttributes.authenticators.forEach(v => {
			delete v.userCounter;
			delete v.userKey;
		});
		
		jwt.sign(publicAttributes, ownJwtToken, {
			expiresIn: "1y",
		}, (err, jwtData) => {
			if(err) return res.status(500).send(err.message);
			
			let returnObj = {
				"token": jwtData,
				"username": publicAttributes.username,
				"factor": 2,
			};
			if(req.returnExtra) {
				returnObj = Object.assign(returnObj, req.returnExtra);
			}
			
			if(req.body.authorizationToken) {
				return res.status(200).send("<script>const authData = JSON.parse('" +JSON.stringify(returnObj)+ "'); window.parent.postMessage(authData, 'https://" + hostname + ":" + frontendPort + "');</script>");
			} else {
				return res.status(200).json(returnObj);
			}
		});
	}).catch(err => {
		return res.status(400).send(err.message);
	});
}