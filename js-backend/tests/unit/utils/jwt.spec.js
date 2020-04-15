const { expect } = require("chai");
const sinon = require("sinon");

const JwtClass = require("../../../utils/jwt.js").JWTHandler;
const JWT = new JwtClass();
const jwtRaw = require("jsonwebtoken");

const testData = {
	test: "test",
};
const testEncoded = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoidGVzdCIsImlzcyI6ImxvY2FsaG9zdCIsImF1ZCI6ImxvY2FsaG9zdCIsImlhdCI6MTU4NjI2NTk3MiwiZXhwIjo0NzQyMDI1OTcyfQ.r0fUhecvGDyWgK2k04E97KZGuaXDErY8oN3arFJh8ug";

describe("JWT (Util)", () => {
	it("loads hostname", () => {
		expect(JWT.hostname).to.equal("localhost");
	});
	
	it("has three age defaults", () => {
		const ages = JWT.age();
		
		expect(ages.SHORT).to.be.a("string");
		expect(ages.MEDIUM).to.be.a("string");
		expect(ages.LONG).to.be.a("string");
	});
	
	it("signs data", async () => {
		const signedShort = await JWT.sign(testData, "key1", "5m");
		const decoded = jwtRaw.decode(signedShort);
		
		expect(decoded.test).to.equal("test");
		expect(decoded.iss).to.equal("localhost");
		expect(decoded.aud).to.equal("localhost");
		expect(decoded.exp - decoded.iat).to.equal(5 * 60);
	});
	
	it("verifies data", async () => {
		const verified = await JWT.verify(testEncoded, "key1", {
			maxAge: "100y",
		});
		
		expect(verified.test).to.equal("test");
		expect(verified.iss).to.equal("localhost");
		expect(verified.aud).to.equal("localhost");
	});
	
	it("signs and verifies its own data", async () => {
		const shortTime = 5*60;
		const mediumTime = 60*60;
		const longTime = 365*24*60*60;
		const now = Math.floor(Date.now() / 1000) - 5;
		
		const signedShort = await JWT.sign(testData, "key1", shortTime);
		const signedMedium = await JWT.sign(testData, "key2", mediumTime);
		const signedLong = await JWT.sign(testData, "key3", longTime);
		
		const verifiedShort = await JWT.verify(signedShort, "key1", {
			clockTimestamp: now+shortTime,
		});
		expect(verifiedShort.test).to.equal("test");
		
		const verifiedMedium = await JWT.verify(signedMedium, "key2", {
			clockTimestamp: now+mediumTime,
			maxAge: JWT.age().MEDIUM,
		});
		expect(verifiedMedium.test).to.equal("test");
		
		const verifiedLong = await JWT.verify(signedLong, "key3", {
			clockTimestamp: now+longTime,
			maxAge: JWT.age().LONG,
		});
		expect(verifiedLong.test).to.equal("test");
		
		try {
			await JWT.verify(signedShort, "key2", {});
			expect.fail("Did not throw an error");
		} catch(err) {
			expect(err.message).to.equal("invalid signature");
		}
		
		try {
			await JWT.verify(signedMedium, "key2", {
				maxAge: JWT.age().SHORT,
				clockTimestamp: now+mediumTime,
			});
			expect.fail("Did not throw an error");
		} catch(err) {
			expect(err.message).to.equal("maxAge exceeded");
		}
	});
});