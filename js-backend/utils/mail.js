const nodemailer = require("nodemailer");

class Mailer {
	constructor(config) {
		this.transport = nodemailer.createTransport(config);
		this.transport.verify(err => {
			if(err) {
				console.error("SMTP server not available", err.message);
			}
		});
		
		if(process.env.SMTPFROM) {
			this.emailFrom = process.env.SMTPFROM;
		} else if(process.env.SMTPUSER) {
			this.emailFrom = "Single Sign-On <"+process.env.SMTPUSER+">";
		} else {
			this.emailFrom = "OWASP Single Sign-On <sso@owasp.org>";
		}
	}
	sendMail(data, callback) {
		if(!data.hasOwnProperty("from")) {
			data.from = this.emailFrom;
		}
		if(!data.hasOwnProperty("html")) {
			data.html = data.text;
		}
		return this.transport.sendMail(data, callback);
	}
}

exports.Mailer = Mailer;