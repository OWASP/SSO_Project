const { expect } = require("chai");
const sinon = require("sinon");

process.env.ARGON2MEMORY = 1000;
const { db } = require("../_shared.js");
const PwClass = require("../../../utils/password.js").PwUtil;
const Pw = new PwClass(db);

const passwordHash = "$argon2id$v=19$m=1000,t=5,p=1$HzqZgE7Q7CU9oDKmC9ygaA$fN2TSsxlLw3dpiSj7W4z736mx2HS//oVfnyrCbc7hUw"; // argon2 hash of "password"
const httpGetStub = sinon.stub(Pw, "httpGet").resolves("cbfdac6008f9cab4083784cbd1874f76618d2a97"); // sha1 hash of "password123"

describe("Password (Util)", () => {
	it("creates a hash", async () => {
		const hashed = await Pw.hashPassword("password123");
		expect(hashed).to.be.a("string");
		
		expect(await Pw.verifyPassword("password123", hashed)).to.equal(true);
	});
	
	it("validates a hash", async () => {
		expect(await Pw.verifyPassword("password", passwordHash)).to.equal(true);
		expect(await Pw.verifyPassword("password123", passwordHash)).to.equal(false);
	});
	
	it("checks a new password", done => {
		// includes pwned password check
		expect(httpGetStub.called).to.equal(false);
		
		Pw.checkPassword("userId", "pass").then(() => {
			expect.fail("Policy incompliant password passed");
		}).catch(() => {
			Pw.checkPassword("userId", "password123").then(() => {
				expect.fail("Pwned passwords not checked");
			}).catch(() => {
				db.execute.callsArgWith(2, null, [{
					password: "$argon2id$v=19$m=1024,t=1,p=1$c29tZXNhbHQ$p+eSWBJTCGd8GwpCpg/sPq00obwlnQWHG06+4dd22s0", // argon2 hash of "owasp-sso-password"
				}]);
				
				Pw.checkPassword("userId", "owasp-sso-password").then(() => {
					expect.fail("Password history not checked");
				}).catch(() => {
					expect(db.execute.called).to.equal(true);
					
					Pw.checkPassword("userId", "owasp-sso-password2").then(() => {
						done();
					});
				});
			});
		});
	});
	
	it("creates random strings", async () => {
		const tasks = [];
		for(let i=0;i<100;i++) {
			tasks.push(Pw.createRandomString(10));
		}
		
		const stringList = await Promise.all(tasks);
		expect((new Set(stringList)).size).to.equal(100, "Duplicate strings were generated");
	});
});