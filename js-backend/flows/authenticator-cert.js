const { execFile } = require("child_process");
const crypto = require("crypto");
const pki = require("node-forge").pki;
const path = require("path");
const fs = require("fs");

const {User, Audit, JWT} = require("../utils");

class CertAuthenticator {
	constructor(customPages, caMap) {
		this.customPages = customPages;
		this.caMap = caMap;
	}
	
	async onCertLogin(req, res, next) {
		let cert = req.connection.getPeerCertificate(true);
		//console.log("cert login", cert, req.user)
		
		if(!cert.subject) {
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
		
		const certMail = cert.subject.emailAddress;
		if(certMail && certMail.toLowerCase() != req.user.username.toLowerCase()) {
			return res.status(403).send("Certificate is designated for another email address");
		}
		
		const certPem = "-----BEGIN CERTIFICATE-----\n" + (cert.raw.toString("base64").match(/.{0,64}/g).join("\n")) + "-----END CERTIFICATE-----";
		const forgeCert = pki.certificateFromPem(certPem);
		
		if(req.body.token) {
			// If a token is provided, we first check if its a custom CA
			// While the post request itself later on is async, the basic checks are sync and should be fine
			let jwtRequest;
			try {
				jwtRequest = await JWT.verify(req.body.token, ownJwtToken, {
					maxAge: JWT.age().MEDIUM,
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
							pki.verifyCertificateChain(this.caMap[authorityFile], [ forgeCert ]);
						} catch (e) {
							continue;
						}
						
						if(!certHandler.webhook || !certHandler.webhook.url) {
							return Audit.add(req, "authenticator", "login", thisPage.name + " certificate").then(() => {
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
									Audit.add(req, "authenticator", "login", thisPage.name + " certificate").then(() => {
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
			pki.verifyCertificateChain(this.caMap["native"], [ forgeCert ]);
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
				Audit.add(req, "authenticator", "login", thisCert.label + " (" + cert.fingerprint256 + ")").then(() => {
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

	onCertRegister(req, res, next) {
		const email = req.user.username;
		const label = req.body.label;
		
		if(email.indexOf('"') != -1) {
			return res.send(500).send("Email address can't be used for generating certificates");
		}
		
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
				
				Audit.add(req, "authenticator", "add", label+" ("+certData.fingerprint256+")").then(() => {
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
}

exports.authenticatorCertFlow = CertAuthenticator;