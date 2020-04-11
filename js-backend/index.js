require("dotenv").config();
const https = require("https");
const express = require("express");
const syslogPro = require("syslog-pro");
const rateLimit = require("express-rate-limit");
const pki = require("node-forge").pki;

const { execFileSync } = require("child_process");
const fs = require("fs");

// Load page settings
const customPages = require("./websites.json");
for (let websiteIndex of Object.keys(customPages)) {
	const thisPage = customPages[websiteIndex];
	
	if(thisPage.hasOwnProperty("syslog")) {
		// Load syslog handler
		// Documentation: https://cyamato.github.io/SyslogPro/module-SyslogPro-Syslog.html
		thisPage.syslog = new syslogPro.Syslog(thisPage.syslog);
		console.log("Loaded syslog for website key", websiteIndex);
	}
}

// Custom classes
const packageList = require("./package.json");
const {User, PwUtil, Audit, JWT, Mailer} = require("./utils");
Audit.prepareLoggers(customPages, packageList.version);

const expressPort = process.env.BACKENDPORT || 3000;
const frontendPort = process.env.FRONTENDPORT || 8080;
const hostname = process.env.DOMAIN || "localhost";
const disableLocalhostPatching = process.env.DISABLELOCALHOSTPATCHING || false;

// Configure Fido2
if(hostname == "localhost" && !disableLocalhostPatching) {
	const utilsLocation = require.resolve("fido2-lib/lib/utils.js");
	if(packageList.dependencies["fido2-lib"] == "^2.1.1" && fs.statSync(utilsLocation).size == 7054) {
		// FIDO2-Lib does not natively support localhost and due to little maintenance this issue hasn't been fixed yet. See https://github.com/apowers313/fido2-lib/pull/19/files
		// To increase usability, this script automatically patches this library if you want to use localhost
		console.warn("Localhost was detected for FIDO2 library - patching fido2-lib now!");
		
		const oldContent = fs.readFileSync(utilsLocation, {encoding: "UTF-8"});
		fs.writeFileSync(utilsLocation, oldContent.replace('if (originUrl.protocol !== "https:") {', 'if (originUrl.protocol !== "https:" && originUrl.hostname !== "localhost") {'));
	}
}

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

// Entrypoint
const app = express();
let ownJwtToken = null;

// Create keys if they don't exist (not mounted/first start)
const keyPath = "keys";
if(!fs.existsSync(keyPath+"/server_key.pem")) {
	const createServerCert = execFileSync("bash", [
		"-c", "scripts/setup.bash '"+fido2Options.rpName+"'",
	]);
	console.log("Server keys have been generated");
}


let serverInstance;
const serverKey = fs.readFileSync(keyPath+"/server_key.pem");
const serverCrt = fs.readFileSync(keyPath+"/server_cert.pem");

// Preprocess CA list
const caList = [serverCrt], caMap = {};
caMap["native"] = pki.createCaStore([ serverCrt.toString() ]);
const caFolder = keyPath+"/ca";
const caFiles = fs.readdirSync(caFolder);
caFiles.forEach(caFile => {
	if(caFile.endsWith(".pem")) {
		const readCa = fs.readFileSync(caFolder+"/"+caFile);
		caMap[caFile] = pki.createCaStore([ readCa.toString() ]);
		caList.push(readCa);
	}
});
console.log(caList.length + " CA loaded");
bundleCAs(caList);

PwUtil.createRandomString(30).then(tempJwtToken => {
	ownJwtToken = tempJwtToken;
	if(hostname == "localhost") ownJwtToken = "hello-world";
	process.env.UNIQUEJWTTOKEN = ownJwtToken;
	
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
	
	const MiddlewareHelper = new (require("./utils/middleware.js").MiddlewareHelper)(User.db);
	app.use(MiddlewareHelper.parseAuthHeader.bind(MiddlewareHelper));
	
	// Flow loader to separate functionalities
	const FlowLoader = require("./flows").FlowLoader;
	const flowLoader = new FlowLoader(fido2Options, customPages, caMap, serverCrt, serverKey);
	flowLoader.addRoutes(app);
	
	// -- Endpoints
	// General
	/*app.get("/logout", (req, res, next) => {
		if(req.user && req.user.token) {
			User.deleteSession(req.user.token).then(() => {})
		}
		
		next()
	}, showSuccess)*/
	app.get("/me", MiddlewareHelper.isLoggedIn, (req, res) => {
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
	app.get("/audit", MiddlewareHelper.isAuthenticated, (req, res) => {
		const currentPage = parseInt(req.query.page) || 0;
		const pageSize = process.env.AUDITPAGELENGTH || 5;
		
		Audit.get(req.user.id, currentPage*pageSize, pageSize).then(results => {
			res.json(results);
		}).catch(err => {
			res.status(500).send(err);
		});
	});
	
	// Start webserver
	if(hostname == "localhost") {
		console.log("Starting API webserver on https://localhost:"+expressPort);
	} else {
		console.log("Starting API webserver for production via internal port "+expressPort);
	}
	
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
