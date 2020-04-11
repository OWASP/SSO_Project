const mysql = require("mysql2");
const fs = require("fs");
const os = require("os");
const child_process = require("child_process");

const db = mysql.createConnection({
	host: process.env.DBHOST || "localhost",
	user: process.env.DBUSER || "owasp_sso",
	database: process.env.DBDATABASE || "owasp_sso",
	password: process.env.DBPASS || "insecure-default-password",
});

const sqlPromise = (query, arguments) => {
	return new Promise((resolve, reject) => {
		db.execute(query, arguments, (err, results) => {
			if(err) {
				reject(err);
			} else {
				resolve(results);
			}
		});
	});
};

// Dynamic baseUrl, so that it can be executed both locally and in CI without having to change things back & forth
const frontendHost = process.env.FRONTENDHOST || "localhost";
const mailHost = process.env.SMTPHOST || "localhost";

module.exports = (on, config) => {
	config.baseUrl = "https://"+frontendHost+"/#";
	config.env.FRONTENDHOST = frontendHost;
	config.env.MAILHOST = mailHost;
	
	on("task", {
		// Run SQL query
		sql(query, arguments) {
			return sqlPromise(query, arguments);
		},
		// Run multiple SQL queries
		sqlBulk(listData) {
			const listPromises = [];
			for(let i=0;i<listData.length;i++) {
				const thisData = listData[i];
				let query, args = [];
				
				if(typeof thisData == "string") {
					query = thisData;
				} else if(Array.isArray(thisData)) {
					query = thisData[0];
					if(thisData.length > 1) {
						args = (typeof thisData[1] == "array") ? thisData[1] : [thisData[1]];
					}
				} else {
					throw new Exception("Unknown data type for bulk SQL");
				}
				
				listPromises.push(sqlPromise(query, args));
			}
			
			return Promise.all(listPromises);
		},
		parseP12(base64Data) {
			return new Promise((resolve, reject) => {
				// Clean up
				const tmpName = os.tmpdir() + "/cypress";
				try {
					fs.unlinkSync(tmpName+".p12");
					fs.unlinkSync(tmpName+".crt");
				} catch(err) {
					// Its fine if they don't exist from a previous run
				}
				
				// Write blob to file
				const dataBuffer = Buffer.from(base64Data, "base64");
				fs.writeFileSync(tmpName+".p12", dataBuffer);
				
				// Convert to pem
				child_process.execFileSync("openssl", [
					"pkcs12",
					"-in", tmpName+".p12",
					"-out", tmpName+".crt",
					"-clcerts", "-nokeys", "-passin", "pass:",
				]);
				
				if(!fs.existsSync(tmpName+".crt")) {
					return reject(new Error("Could not convert p12 to pem using openssl (is it installed?)"));
				}
				
				// Check result
				const resultPem = fs.readFileSync(tmpName+".crt", "utf8");
				
				const certParts = resultPem.match(/localKeyID: ([\s\S]+?)\s*subject=([\s\S]+?)\s*issuer=([\s\S]+?)\s*(-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----)/);
				if(!certParts) {
					return reject(new Error("Can't extract all parts from the certificate"));
				}
				
				resolve({
					meta: {
						certificate: certInfoToMap(certParts[2]),
						issuer: certInfoToMap(certParts[3]),
					},
					certificate: certParts[4],
					id: certParts[1].trim().replace(/ /g, ":"),
				});
			});
		},
	});
	
	return config;
}

// Convert "CN = asdf, O = Org" to {CN: "asdf", O: "Org"}
function certInfoToMap(str) {
	const parts = str.split(", ");
	const resultMap = {};
	
	parts.forEach(item => {
		const itemParts = item.split(" = ");
		resultMap[itemParts[0]] = itemParts[1];
	});
	
	return resultMap;
}
