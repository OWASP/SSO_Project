const {User, Audit, PwUtil, Mailer} = require("../utils");

class LocalAuth {
	constructor() {
		this.hostname = process.env.DOMAIN || "localhost";
	}
	
	onLocalLogin(req, res, next) {
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
			return Audit.add(req, "login", "password", null);
		}).then(() => {
			req.loginEmail = req.body.username;
			next();
		}).catch(err => {
			console.error(err);
			res.status(500).send("Internal error during login");
		});
	}

	onLocalEmailAuth(req, res, next) {
		const email = req.user.username;
		
		User.requestEmailActivation(email, Audit.getIP(req), "login").then(token => {
			Mailer.sendMail({
				to: email,
				subject: "Log into OWASP Single Sign-On",
				text: "To confirm your login click on https://" + this.hostname + "/#/two-factor/"+token,
			}, err => {
				if(err) return res.status(500).send(err.message);
				next();
			});
		}).catch(err => {
			console.error(err);
			res.status(400).send("Something went wrong");
		});
	}

	onRegister(req, res, next) {
		const email = req.body.email;
		
		User.requestEmailActivation(email, Audit.getIP(req), "registration").then(token => {
			Mailer.sendMail({
				to: email,
				subject: "Confirm your email address",
				text: "To confirm your email click on https://" + this.hostname + "/#/register/"+token,
			}, err => {
				if(err) return res.status(500).send(err.message);
				
				next();
			});
		}).catch(err => {
			res.status(400).send(err);
		});
	}

	onChangeRequest(req, res, next) {
		const email = req.body.email;
		
		User.requestEmailActivation(email, Audit.getIP(req), "change").then(token => {
			Mailer.sendMail({
				to: email,
				subject: "Change your password",
				text: "To change your password click on https://" + this.hostname + "/#/change-password/"+token,
			}, err => {
				if(err) return res.status(500).send(err.message);
				next();
			});
		}).catch(err => {
			if(this.hostname=="localhost") {
				res.status(400).send(err);
			} else {
				next();
			}
		});
	}

	onActivate(req, res, next) {
		const token = req.body.token;
		const password = req.body.password;
		
		PwUtil.checkPassword(null, password).then(() => {
			return User.resolveEmailActivation(token, Audit.getIP(req), "registration");
		}).then(confirmation => {
			req.body.username = confirmation.username;
			
			next();
		}).catch(err => {
			res.status(400).send(err);
		});
	}

	onChange(req, res, next) {
		const token = req.body.token;
		const password = req.body.password;
		
		let confirmation;
		let userId;
		User.resolveEmailActivation(token, Audit.getIP(req), "change", true).then(confirmed => {
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
	
	onEmailConfirm(req, res, next) {
		// Inbound email verification
		const token = req.query.token;
		const action = req.query.action;

		Audit.add(req, action, "email", null).then(aID => {
			switch(action) {
				default:
					return res.status(400).send("Invalid action");
				case "login":
					return User.resolveEmailActivation(token, Audit.getIP(req), action).then(confirmation => {
						next();
					}).catch(err => {
						res.status(400).send(err);
					});
			}
		}).catch(err => {
			res.status(500).send(err);
		});
	}
}

exports.localAuthFlow = LocalAuth;