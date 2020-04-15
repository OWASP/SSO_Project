import { mount } from "@vue/test-utils";
import { expect } from "chai";
import sinon from "sinon";

import AuthenticatorManage from "@/components/AuthenticatorManage.vue";
import "@/plugins/vee-validate";

const apiPost = sinon.stub(),
	apiGet = sinon.stub(),
	axios = sinon.stub(),
	navigatorCreate = sinon.stub(),
	confirmStub = sinon.stub();

apiGet.resolves({
	data: {
		token: "token",
		options: {
			challenge: "challenge",
			user: {
				id: "id",
			},
		},
	},
});
apiPost.resolves({});

const baseOptions = {
	data() {
		return {
			fidoAvailable: true,
		};
	},
	mocks: {
		$t: key => key,
		axios,
	},
	parentComponent: {
		data() {
			return {
				user: {
					session: "session",
					username: "username",
					authenticators: [{
						handle: "handle",
						userHandle: "userHandle",
						type: "fido2",
						label: "label",
					}],
				},
				backend: "backend",
			};
		},
		methods: {
			apiPost,
			apiGet,
		},
	},
};
const wrapper = mount(AuthenticatorManage, baseOptions);

describe("AuthenticatorManage (Component)", () => {
	it("can delete an authenticator", async () => {
		expect(apiPost.called).to.equal(false);
		expect(confirmStub.called).to.equal(false);
		expect(wrapper.emitted("reload")).to.equal(undefined);
		
		confirmStub.returns(true);
		global.confirm = confirmStub;
		
		wrapper.get("a.remove-authenticator").trigger("click");
		await wrapper.vm.$nextTick();
		
		expect(confirmStub.called).to.equal(true);
		expect(apiPost.calledWith("/authenticator/delete")).to.equal(true);
		expect(wrapper.emitted("reload").length).to.equal(1);
	});
	
	it("creates a certificate", done => {
		expect(axios.called).to.equal(false);
		
		const createObjectURL = sinon.stub();
		createObjectURL.returns("createObjectURL");
		window.URL.createObjectURL = createObjectURL;
		
		axios.resolves({
			data: {
				data: "data",
			},
		});
		
		wrapper.setData({
			createType: "cert",
			createLabel: "createLabel",
		});
		wrapper.vm.$nextTick().then(() => {
			const beforeCalls = wrapper.emitted("reload") ? wrapper.emitted("reload").length : 0;
			
			wrapper.get("form").trigger("submit");
			setTimeout(() => {
				expect(axios.called).to.equal(true);
				expect(createObjectURL.called).to.equal(true);
				expect(wrapper.emitted("reload").length).to.equal(beforeCalls+1);
				
				done();
			}, 10);
		});
	});
	
	it("creates a fido2 authenticator", done => {
		expect(apiGet.called).to.equal(false);
		expect(navigatorCreate.called).to.equal(false);
		expect(apiPost.calledWith("/fido2/register")).to.equal(false);
		
		wrapper.setData({
			createType: "fido",
			createLabel: "createLabel",
		});
		
		navigatorCreate.resolves({
			id: "id",
			rawId: "rawId",
			response: {
				clientDataJSON: "clientDataJSON",
				attestationObject: "attestationObject",
			},
			type: "fido2",
		});
		delete navigator.credentials;
		navigator.credentials = {
			create: navigatorCreate,
		};
		
		wrapper.vm.$nextTick().then(() => {
			const beforeCalls = wrapper.emitted("reload") ? wrapper.emitted("reload").length : 0;
			
			wrapper.get("form").trigger("submit");
			setTimeout(() => {
				expect(apiGet.calledWith("/fido2/register")).to.equal(true);
				expect(navigatorCreate.called).to.equal(true);
				expect(apiPost.calledWith("/fido2/register")).to.equal(true);
				expect(wrapper.emitted("reload").length).to.equal(beforeCalls+1);
				
				done();
			}, 10);
		});
	});
});