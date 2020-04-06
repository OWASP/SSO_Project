import { shallowMount } from "@vue/test-utils";
import { expect } from "chai";
import sinon from "sinon";

import FlowIn from "@/views/flow-in.vue";

const responseToken = {
	data: {
		username: "username",
		page: {
			id: 1,
		},
	},
};

const apiPost = sinon.stub(),
	apiGet = sinon.stub();
apiPost.resolves(responseToken);
apiGet.resolves(responseToken);

const baseOptions = {
	mocks: {
		$t: key => key,
	},
	parentComponent: {
		methods: {
			apiPost,
			apiGet,
		},
	},
};

describe("Flow-in (View)", () => {
	it("processes SAML correctly", async () => {
		const setLoginTokenSAML = sinon.spy(),
			localStorageSetSAML = sinon.stub(),
			redirectSAML = sinon.spy();
		
		baseOptions.mocks.$route = {
			params: {
				id: "saml",
			},
			query: {
				SAMLRequest: "SAMLRequest",
				RelayState: "RelayState",
			},
		};
		baseOptions.parentComponent.methods.setLoginToken = setLoginTokenSAML;
		global.localStorage = {
			setItem: localStorageSetSAML,
		};
		delete window.location;
		window.location = {
			reload: redirectSAML,
		};
		const samlWrapper = shallowMount(FlowIn, baseOptions);
		
		await samlWrapper.vm.$nextTick();
		
		expect(apiGet.calledWith("/saml")).to.equal(true);
		expect(setLoginTokenSAML.calledWith("username")).to.equal(true);
		expect(localStorageSetSAML.calledWith("sso-request")).to.equal(true);
		expect(redirectSAML.called).to.equal(true);
	});
	
	it("processes JWT correctly", async () => {
		const setLoginTokenJWT = sinon.spy(),
			localStorageSetJWT = sinon.stub(),
			redirectJWT = sinon.spy();
		
		baseOptions.mocks.$route = {
			params: {
				id: "1",
				data: "data",
			},
		};
		baseOptions.parentComponent.methods.setLoginToken = setLoginTokenJWT;
		global.localStorage = {
			setItem: localStorageSetJWT,
		};
		delete window.location;
		window.location = {
			reload: redirectJWT,
		};
		const jwtWrapper = shallowMount(FlowIn, baseOptions);
		
		await jwtWrapper.vm.$nextTick();
		
		expect(apiPost.calledWith("/flow/in")).to.equal(true);
		expect(setLoginTokenJWT.calledWith("username")).to.equal(true);
		expect(localStorageSetJWT.calledWith("sso-request")).to.equal(true);
		expect(redirectJWT.called).to.equal(true);
	});
});