import { shallowMount } from "@vue/test-utils";
import { expect } from "chai";
import sinon from "sinon";
import Audit from "@/views/audit.vue";

const getMe = sinon.spy(),
	logout = sinon.spy(),
	apiPost = sinon.stub();

const baseOptions = {
	mocks: {
		$t: key => key,
	},
	stubs: [
		"AuditLog",
		"AuthenticatorManage",
	],
	parentComponent: {
		methods: {
			getMe,
			logout,
			apiPost,
		},
	},
};
const wrapper = shallowMount(Audit, baseOptions);

baseOptions.parentComponent.data = () => {
	return {
		ssoPage: {
			name: "Test",
			pageId: 1,
			flowType: "jwt",
		},
	};
};
const ssoWrapper = shallowMount(Audit, baseOptions);

baseOptions.parentComponent.data = () => {
	return {
		ssoPage: {
			name: "Test",
			pageId: 1,
			flowType: "saml",
		},
	};
};
const ssoSAMLWrapper = shallowMount(Audit, baseOptions);

describe("Audit (View)", () => {
	it("loads the user on mount", () => {
		expect(getMe.called).to.equal(true);
		expect(wrapper.vm.$data.loading).to.equal(false);
	});
	
	it("calls logout", () => {
		expect(logout.called).to.equal(false);
		wrapper.get("button.btn-warning").trigger("click");
		expect(logout.called).to.equal(true);
	});
	
	it("only shows SSO login button if valid", () => {
		expect(wrapper.find("button.btn-primary.float-right").exists()).to.equal(false);
		expect(ssoWrapper.find("button.btn-primary.float-right").exists()).to.equal(true);
	});
	
	it("JWT flow works", done => {
		apiPost.resetHistory();
		expect(apiPost.called).to.equal(false);
		expect(ssoWrapper.vm.$data.jwtToken).to.equal("");
		
		apiPost.resolves({
			data: {
				redirect: "http://example.com",
				token: "token",
			},
		});
		ssoWrapper.get("button.btn-primary.float-right").trigger("click");
		
		window.HTMLFormElement.prototype.submit = () => {
			done();
		};
		
		ssoWrapper.vm.$nextTick().then(() => {
			expect(apiPost.called).to.equal(true);
			expect(apiPost.calledWith("/flow/out")).to.equal(true);
			
			expect(ssoWrapper.vm.$data.redirect).to.equal("http://example.com");
			expect(ssoWrapper.vm.$data.jwtToken).to.equal("token");
			expect(ssoWrapper.vm.$data.SAMLResponse).to.equal("");
			expect(ssoWrapper.vm.$data.RelayState).to.equal("");
		});
	});
	
	it("SAML flow works", done => {
		apiPost.resetHistory();
		expect(apiPost.called).to.equal(false);
		expect(ssoSAMLWrapper.vm.$data.SAMLResponse).to.equal("");
		
		apiPost.resolves({
			data: {
				redirect: "http://example.com",
				SAMLResponse: "SAMLResponse",
				RelayState: "RelayState",
			},
		});
		ssoSAMLWrapper.get("button.btn-primary.float-right").trigger("click");
		
		window.HTMLFormElement.prototype.submit = () => {
			done();
		};
		
		ssoSAMLWrapper.vm.$nextTick().then(() => {
			expect(apiPost.calledWith("/flow/out")).to.equal(true);
			
			expect(ssoSAMLWrapper.vm.$data.jwtToken).to.equal("");
			expect(ssoSAMLWrapper.vm.$data.SAMLResponse).to.equal("SAMLResponse");
			expect(ssoSAMLWrapper.vm.$data.RelayState).to.equal("RelayState");
		});
	});
});