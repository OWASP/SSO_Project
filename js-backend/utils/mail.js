const nodemailer = require("nodemailer");

class Mailer {
	constructor(config) {
		this.transport = nodemailer.createTransport(config);
		this.transport.verify(err => {
			if(err) {
				console.error("SMTP server not available", err);
			}
		});
		
		this.emailFrom = process.env.SMTPUSER || process.env.FALLBACKEMAILFROM || "sso@owasp.org";
	}
	sendMail(data, callback) {
		if(!data.hasOwnProperty("from")) {
			data.from = "OWASP Single Sign-On <"+this.emailFrom+">";
		}
		if(!data.hasOwnProperty("html")) {
			data.html = data.text;
		}
		return this.transport.sendMail(data, callback);
	}
}

exports.Mailer = Mailer;