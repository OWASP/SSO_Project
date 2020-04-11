const rateLimit = require("express-rate-limit");
const {User, Audit, Mailer} = require("../utils");
const MiddlewareHelper = new (require("../utils/middleware.js").MiddlewareHelper)(User.db);

// Flow items
const ssoFlow = require("./sso-flow.js").ssoFlow;
const authenticatorFlow = require("./authenticator.js").authenticatorFlow;
const authenticatorCertFlow = require("./authenticator-cert.js").authenticatorCertFlow;
const localAuthFlow = require("./local-auth.js").localAuthFlow;

class FlowLoader {
	constructor(fido2Options, customPages, caMap, serverCrt, serverKey) {
		this.fido2Options = fido2Options;
		this.customPages = customPages;
		this.authenticatorFlow = new authenticatorFlow(fido2Options);
		this.authenticatorCertFlow = new authenticatorCertFlow(customPages, caMap);
		this.localAuthFlow = new localAuthFlow();
		this.ssoFlow = new ssoFlow(customPages, fido2Options, serverCrt, serverKey);
	}
	
	addRoutes(app) {
		app.use(this.ssoFlow.parseSSOHeader.bind(this.ssoFlow));
		app.get("/email-confirm", this.localAuthFlow.onEmailConfirm.bind(this.localAuthFlow), MiddlewareHelper.createAuthToken.bind(MiddlewareHelper));
	
		app.post("/authenticator/delete", MiddlewareHelper.isAuthenticated.bind(MiddlewareHelper), this.authenticatorFlow.onAuthenticatorDelete.bind(this.authenticatorFlow), MiddlewareHelper.showSuccess);
		
		// User SSO flow
		app.route("/flow/in").get(this.ssoFlow.onFlowIn.bind(this.ssoFlow), MiddlewareHelper.showSuccess).post(this.ssoFlow.onFlowIn.bind(this.ssoFlow), MiddlewareHelper.showSuccess);
		app.post("/flow/out", MiddlewareHelper.isAuthenticated.bind(MiddlewareHelper), this.ssoFlow.onFlowOut.bind(this.ssoFlow), MiddlewareHelper.showSuccess);
		app.get("/default-page", (req, res, next) => {
			const defaultPage = this.customPages["default"];
			return res.status(200).json({
				name: defaultPage.name,
				branding: defaultPage.branding,
			});
		});
		app.get("/saml", this.ssoFlow.onSamlIn.bind(this.ssoFlow));
		app.get("/saml/FederationMetadata/2007-06/FederationMetadata.xml", this.ssoFlow.onSamlMeta.bind(this.ssoFlow));
		
		// Registration
		app.post("/local/register", rateLimit({
			windowMs: 1 * 60 * 1000,
			max: 5,
			message: "Too many registration requests, please try again later.",
			headers: false,
		}), MiddlewareHelper.antiTiming, this.localAuthFlow.onRegister.bind(this.localAuthFlow), MiddlewareHelper.showSuccess);
		app.post("/local/activate", this.localAuthFlow.onActivate.bind(this.localAuthFlow), (req, res, next) => {
			User.addUser(req.body.username, req.body.password).then(userId => {
				req.user = {id: userId}; // skip 2fa
				next();
			});
		}, MiddlewareHelper.createAuthToken.bind(MiddlewareHelper));
		app.post("/local/change-request", rateLimit({
			windowMs: 1 * 60 * 1000,
			max: 5,
			message: "Too many change requests, please try again later.",
			headers: false,
		}), MiddlewareHelper.antiTiming, this.localAuthFlow.onChangeRequest.bind(this.localAuthFlow), MiddlewareHelper.showSuccess);
		app.post("/local/change", this.localAuthFlow.onChange.bind(this.localAuthFlow), MiddlewareHelper.createAuthToken.bind(MiddlewareHelper));
		app.post("/local/session-clean", MiddlewareHelper.isAuthenticated.bind(MiddlewareHelper), (req, res, next) => {
			const token = req.user.token;
			Audit.add(req, "session", "clean", null).then(() => {
				User.cleanSession(req.user.id, token).then(() => {
					next();
				}).catch(err => {
					res.status(400).send(err);
				});
			});
		}, MiddlewareHelper.showSuccess);
		
		// Local auth
		app.post("/local/login", rateLimit({
			windowMs: 5 * 60 * 1000,
			max: 20,
			message: "Too many login requests, please try again later.",
			headers: false,
		}), MiddlewareHelper.antiTiming, this.localAuthFlow.onLocalLogin.bind(this.localAuthFlow), MiddlewareHelper.createLoginToken.bind(MiddlewareHelper));
		app.get("/local/email-auth", rateLimit({
			windowMs: 5 * 60 * 1000,
			max: 5,
			message: "Too many email authentication requests, please try again later.",
			headers: false,
		}), MiddlewareHelper.isLoggedIn, this.localAuthFlow.onLocalEmailAuth.bind(this.localAuthFlow), MiddlewareHelper.showSuccess);
		
		// FIDO2
		app.get("/fido2/register", MiddlewareHelper.isAuthenticated.bind(MiddlewareHelper), this.authenticatorFlow.onFidoRegisterGet.bind(this.authenticatorFlow));
		app.post("/fido2/register", MiddlewareHelper.isAuthenticated.bind(MiddlewareHelper), this.authenticatorFlow.checkLabel, this.authenticatorFlow.onFidoRegisterPost.bind(this.authenticatorFlow), MiddlewareHelper.showSuccess);
		app.get("/fido2/login", MiddlewareHelper.isLoggedIn, this.authenticatorFlow.onFidoLoginGet.bind(this.authenticatorFlow));
		app.post("/fido2/login", MiddlewareHelper.isLoggedIn, this.authenticatorFlow.onFidoLoginPost.bind(this.authenticatorFlow), MiddlewareHelper.createAuthToken.bind(MiddlewareHelper));
		
		// Client certificate
		app.post("/cert/login", rateLimit({
			windowMs: 5 * 60 * 1000,
			max: 50,
			message: "Too many certificate login requests, please try again later.",
			headers: false,
		}), this.isLoggedInBridge.bind(this), this.authenticatorCertFlow.onCertLogin.bind(this.authenticatorCertFlow), MiddlewareHelper.createAuthToken.bind(MiddlewareHelper));
		app.post("/cert/register", MiddlewareHelper.isAuthenticated.bind(MiddlewareHelper), this.authenticatorFlow.checkLabel.bind(this.authenticatorFlow), this.authenticatorCertFlow.onCertRegister.bind(this.authenticatorCertFlow));
	}
	
	// Client certificate is not used via REST normally, so we need a bridge for a POST request
	isLoggedInBridge(req, res, next) {
		if(!req.user || !req.user.id) {
			let passBridge = false;
			const authorizationBridge = req.body.authorizationToken;
			
			if(authorizationBridge) {
				MiddlewareHelper.checkAuthToken(authorizationBridge).then(authentication => {
					req.user = authentication;
					
					// Bridge certificate header for localhost setup
					if(req.body.certificate && this.fido2Options.rpId == "localhost") {
						console.warn("Certificate bridge for testing used");
						req.headers["x-tls-verified"] = "SUCCESS";
						req.headers["x-tls-cert"] = req.body.certificate;
					}
					
					next();
				}).catch(err => {
					console.error("Token verification failed", err);
					return res.status(403).send("You need to be signed in");
				});
			} else {
				return res.status(403).send("You need to be signed in");
			}
		}
	}
}

exports.FlowLoader = FlowLoader;