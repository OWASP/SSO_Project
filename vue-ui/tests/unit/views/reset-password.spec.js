import { mount } from "@vue/test-utils";
import { expect } from "chai";
import sinon from "sinon";

import ResetPassword from "@/views/reset-password.vue";
import "@/plugins/vee-validate";

const apiPost = sinon.stub();
apiPost.resolves({});

const baseOptions = {
	data() {
		return {
			email: "email",
		};
	},
	mocks: {
		$t: key => key,
	},
	stubs: [
		"router-link",
	],
	parentComponent: {
		methods: {
			apiPost,
		},
	},
};
const wrapper = mount(ResetPassword, baseOptions);

describe("Reset Password (View)", () => {
	it("forwards reset request", async () => {
		expect(wrapper.vm.success).to.equal(null);
		expect(apiPost.called).to.equal(false);
		
		wrapper.vm.submit();
		await wrapper.vm.$nextTick();
		
		expect(wrapper.vm.success).to.equal(true);
		expect(apiPost.calledWith("/local/change-request")).to.equal(true);
	});
});