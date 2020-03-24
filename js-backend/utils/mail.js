const nodemailer = require("nodemailer");

class Mailer {
	constructor(config) {
		this.transport = nodemailer.createTransport(config);
		this.transport.verify(err => {
			if(err) {
				console.error("SMTP server not available", err);
			}
		});
	}
	sendMail(data, callback) {
		return this.transport.sendMail(data, callback);
	}
}

exports.Mailer = Mailer;