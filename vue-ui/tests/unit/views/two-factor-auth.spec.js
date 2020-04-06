import { shallowMount } from "@vue/test-utils";
import { expect } from "chai";
import sinon from "sinon";
import TwoFA from "@/views/two-factor-auth.vue";

const setLoginToken = sinon.spy(),
	getMe = sinon.stub(),
	logout = sinon.spy(),
	apiPost = sinon.stub(),
	apiGet = sinon.stub(),
	routerPush = sinon.spy();

getMe.resolves({});
apiGet.withArgs("/email-confirm").resolves({
	data: {
		username: "username",
		test: "test",
	},
});
apiPost.resolves({
	data: {
		username: "username",
		test: "test",
	},
});

const baseOptions = {
	data() {
		return {
			fidoAvailable: true,
		};
	},
	mocks: {
		$t: key => key,
		$router: {
			push: routerPush,
		},
	},
	parentComponent: {
		data() {
			return {
				user: {
					id: 1,
					isAuthenticated: false,
					authenticators: [{
						type: "fido2",
					}],
				},
			};
		},
		methods: {
			getMe,
			logout,
			apiPost,
			apiGet,
			setLoginToken,
		},
	},
};
// Has all things set, but user is unknown and needs to be loaded
const wrapper = shallowMount(TwoFA, baseOptions);

describe("Two-Factor-Auth (View)", () => {
	it("calls logout", async () => {
		logout.resetHistory();
		
		expect(logout.called).to.equal(false);
		wrapper.get("#logout").trigger("click");
		await wrapper.vm.$nextTick();
		
		expect(logout.called).to.equal(true);
	});
	
	it("redirects authenticated users", async () => {
		routerPush.resetHistory();
		
		baseOptions.parentComponent.data = () => {
			return {
				fidoAvailable: true,
				user: {
					isAuthenticated: true,
					authenticators: [],
				},
			};
		};
		const redirectWrapper = shallowMount(TwoFA, baseOptions);
		await redirectWrapper.vm.$nextTick();
		
		expect(routerPush.calledWith("/audit")).to.equal(true);
	});
	
	it("requests email confirmation", async () => {
		expect(wrapper.vm.$data.emailClicked).to.equal(false);
		expect(apiGet.calledWith("/local/email-auth")).to.equal(false);
		
		apiGet.withArgs("/local/email-auth").resolves({});
		wrapper.get("#confirmEmail").trigger("click");
		await wrapper.vm.$nextTick();
		
		expect(wrapper.vm.$data.emailClicked).to.equal(true);
		expect(apiGet.calledWith("/local/email-auth")).to.equal(true);
	});
	
	it("automatically activates email token", async () => {
		getMe.resetHistory();
		apiGet.resetHistory();
		setLoginToken.resetHistory();
		routerPush.resetHistory();
		
		// EMail confirmation
		baseOptions.mocks.$route = {
			params: {
				token: "12345",
			},
		};
		baseOptions.parentComponent.data = () => {
			return {
				user: {
					isAuthenticated: false,
					authenticators: [{
						type: "fido2",
					}],
				},
			};
		};
		const confirmWrapper = shallowMount(TwoFA, baseOptions);
		await confirmWrapper.vm.$nextTick();
		
		expect(getMe.called).to.equal(true);
		expect(apiGet.calledWith("/email-confirm")).to.equal(true);
		expect(setLoginToken.calledWith("username")).to.equal(true);
		expect(routerPush.calledWith("/audit")).to.equal(true);
	});
	
	it("requests fido token", async () => {
		setLoginToken.resetHistory();
		routerPush.resetHistory();
		expect(apiGet.calledWith("/fido2/login")).to.equal(false);
		expect(apiPost.called).to.equal(false);
		
		apiGet.withArgs("/fido2/login").resolves({
			data: {
				token: "token",
				options: {
					challenge: "challenge",
					allowCredentials: [{
						id: "id",
					}],
				},
			},
		});
		
		const navigatorGet = sinon.stub();
		navigatorGet.resolves({
			id: "id",
			rawId: "rawId",
			response: {
				clientDataJSON: "clientDataJSON",
				authenticatorData: "authenticatorData",
				signature: "signature",
			},
			type: "type",
		});
		
		delete navigator.credentials;
		navigator.credentials = {
			get: navigatorGet,
		};
		
		wrapper.get("#confirmFido").trigger("click");
		await wrapper.vm.$nextTick();
		
		expect(navigatorGet.called).to.equal(true);
		expect(apiGet.calledWith("/fido2/login")).to.equal(true);
		
		await wrapper.vm.$nextTick();
		expect(apiPost.calledWith("/fido2/login")).to.equal(true);
		
		await wrapper.vm.$nextTick();
		expect(setLoginToken.calledWith("username")).to.equal(true);
		expect(routerPush.calledWith("/audit")).to.equal(true);
	});
});