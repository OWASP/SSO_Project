import { shallowMount, mount, createLocalVue } from "@vue/test-utils";
import { expect } from "chai";
import sinon from "sinon";

import ChangePassword from "@/views/change-password.vue";
import "@/plugins/vee-validate";

const setLoginToken = sinon.spy(),
	routerPush = sinon.spy(),
	apiPost = sinon.stub();

const baseOptions = {
	mocks: {
		$t: key => key,
		$route: {
			params: {
				token: "12345",
			},
		},
		$router: {
			push: routerPush,
		},
	},
	parentComponent: {
		methods: {
			setLoginToken,
			apiPost,
		},
	},
};
const wrapper = mount(ChangePassword, baseOptions);

const longToken = "123456789012345678901234567890123456789012345678901234567890";
baseOptions.mocks.$route.params.token = longToken;
const tokenWrapper = mount(ChangePassword, baseOptions);

describe("Change Password (View)", () => {
	it("has proper default values", () => {
		expect(wrapper.vm.$data.token).to.equal("12345");
		expect(tokenWrapper.vm.$data.token).to.equal(longToken);
	});
	
	it("allows the token to be entered if it is too short", () => {
		expect(wrapper.vm.tokenFromUrl).to.equal(false);
		expect(tokenWrapper.vm.tokenFromUrl).to.equal(true);
		
		expect(wrapper.get("#token").attributes().hasOwnProperty("disabled")).to.equal(false);
		expect(tokenWrapper.get("#token").attributes().hasOwnProperty("disabled")).to.equal(true);
	});
	
	it("disabled the token when it is complete", async () => {
		expect(wrapper.vm.$data.token).to.equal("12345");
		expect(wrapper.vm.tokenFromUrl).to.equal(false);
		
		wrapper.setData({
			token: longToken,
		});
		await wrapper.vm.$nextTick();
		
		expect(wrapper.vm.$data.token).to.equal(longToken);
		expect(wrapper.vm.tokenFromUrl).to.equal(true);
	});
	
	it("delegates a login to $root", async () => {
		expect(apiPost.called).to.equal(false);
		expect(routerPush.called).to.equal(false);
		expect(setLoginToken.called).to.equal(false);
		
		tokenWrapper.setData({
			password: "password",
		});
		await tokenWrapper.vm.$nextTick();
		
		apiPost.resolves({
			data: {
				username: "username",
				side: "side",
			},
		});
		
		tokenWrapper.vm.submit();
		await tokenWrapper.vm.$nextTick();
		
		expect(apiPost.calledWith("/local/change")).to.equal(true);
		expect(routerPush.called).to.equal(true);
		expect(setLoginToken.called).to.equal(true);
	});
});