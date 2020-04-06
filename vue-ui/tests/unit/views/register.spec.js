import { mount } from "@vue/test-utils";
import { expect } from "chai";
import sinon from "sinon";

import Register from "@/views/register.vue";
import "@/plugins/vee-validate";

const setLoginToken = sinon.spy(),
	routerPush = sinon.spy(),
	apiPost = sinon.stub();

apiPost.resolves({
	data: {
		username: "username",
		test: "test",
	},
});

const baseOptions = {
	data() {
		return {
			email: "email",
			password: "password",
		};
	},
	mocks: {
		$t: key => key,
		$route: {
			params: {
				token: "",
			},
		},
		$router: {
			push: routerPush,
		},
	},
	stubs: [
		"router-link",
	],
	parentComponent: {
		methods: {
			setLoginToken,
			apiPost,
		},
	},
};
const wrapper = mount(Register, baseOptions);

baseOptions.mocks.$route.params = {
	token: "12345",
};
const activateWrapper = mount(Register, baseOptions);

describe("Register (View)", () => {
	it("loads proper default values", () => {
		expect(wrapper.vm.$data.token).to.equal("");
		expect(wrapper.vm.$data.error).to.equal(0);
		expect(wrapper.vm.$data.agreeToC).to.equal(false);
		expect(wrapper.vm.$data.success).to.equal(null);
		
		expect(activateWrapper.vm.$data.token).to.equal("12345");
	});
	
	it("forwards registration request", async () => {
		expect(apiPost.calledWith("/local/register")).to.equal(false);
		
		wrapper.vm.submit();
		await wrapper.vm.$nextTick();
		
		expect(apiPost.calledWith("/local/register")).to.equal(true);
		expect(wrapper.vm.$data.success).to.equal(true);
	});
	
	it("forwards activation request", async () => {
		expect(apiPost.calledWith("/local/activate")).to.equal(false);
		
		activateWrapper.vm.submit();
		await activateWrapper.vm.$nextTick();
		
		expect(apiPost.calledWith("/local/activate")).to.equal(true);
		expect(setLoginToken.calledWith("username")).to.equal(true);
		expect(routerPush.calledWith("/audit")).to.equal(true);
	});
});