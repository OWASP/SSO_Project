const { expect } = require("chai");

const MailClass = require("../../../utils/mail.js").Mailer;
const Mailer = new MailClass({});

describe("Mail (Util)", () => {
	it("initializes correctly", () => {
		expect(Mailer.transport).to.be.a("object");
		expect(Mailer.emailFrom).to.be.a("string");
	});
	
	it("sends email", done => {
		Mailer.transport.sendMail = (data, cb) => {
			expect(data.hasOwnProperty("from")).to.equal(true);
			expect(data.hasOwnProperty("html")).to.equal(true);
			expect(data.html).to.equal(data.text);
			expect(cb).to.equal("callback");
			
			done();
		};
		
		Mailer.sendMail({
			text: "text",
		}, "callback");
	});
});