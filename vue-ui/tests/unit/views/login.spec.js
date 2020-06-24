import { mount } from "@vue/test-utils";
import { expect } from "chai";
import sinon from "sinon";

import Login from "@/views/login.vue";
import "@/plugins/vee-validate";

const setLoginToken = sinon.spy(),
	routerPush = sinon.spy(),
	apiPost = sinon.stub(),
	getMe = sinon.stub(),
	useLoginToken = sinon.spy(),
	listLoginToken = sinon.stub();

apiPost.resolves({
	data: {
		username: "username",
		test: "test",
	},
});
getMe.resolves({});
listLoginToken.returns(["email1", "email2"]);

const baseOptions = {
	data() {
		return {
			email: "email",
			password: "password",
			certSubmitted: true,
		};
	},
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
	stubs: [
		"router-link",
	],
	parentComponent: {
		methods: {
			listLoginToken,
			useLoginToken,
			setLoginToken,
			apiPost,
			getMe,
		},
	},
};
const wrapper = mount(Login, baseOptions);

baseOptions.parentComponent.data = () => {
	return {
		authToken: "authToken",
		user: {
			isAuthenticated: false,
			id: 1,
		},
	};
};

describe("Login (View)", () => {
	it("only shows login to guest users", () => {
		expect(getMe.called).to.equal(false);
		expect(apiPost.called).to.equal(false);
		expect(wrapper.vm.$data.loading).to.equal(false);
		expect(listLoginToken.called).to.equal(true);
	});
	
	it("can resume a logged in session", async () => {
		expect(useLoginToken.called).to.equal(false);
		
		wrapper.get("#resume-session a").trigger("click");
		await wrapper.vm.$nextTick();
		expect(useLoginToken.calledWith("email1")).to.equal(true);
	});
	
	it("forwards login attempts", async () => {
		expect(apiPost.called).to.equal(false);
		expect(setLoginToken.called).to.equal(false);
		
		wrapper.get("form").trigger("submit");
		await wrapper.vm.$nextTick();
		
		expect(apiPost.calledWith("/local/login")).to.equal(true);
		expect(setLoginToken.calledWith("username")).to.equal(true);
		expect(wrapper.vm.$data.loading).to.equal(false);
		// The routeUser routine doesn't get called, because we can not properly change the $root.authToken as reaction to setLoginToken
		// This is why we need to test it in two parts
		expect(getMe.called).to.equal(false);
	});
	
	it("attempts a cert login after a successful login", done => {
		expect(getMe.called).to.equal(false);

		window.HTMLFormElement.prototype.submit = () => {
			expect(getMe.called).to.equal(true);
			
			done();
		};
		
		const loggedinWrapper = mount(Login, baseOptions);
		loggedinWrapper.vm.$nextTick().then(() => {
			loggedinWrapper.vm.routeUser();
		});
	});
	
	it("falls back to two-factor if certificate times out", done => {
		routerPush.resetHistory();
		window.HTMLFormElement.prototype.submit = () => {};
		
		const loggedinWrapper = mount(Login, baseOptions);
		loggedinWrapper.vm.$nextTick().then(() => {
			loggedinWrapper.vm.certFrameLoad();
			setTimeout(() => {
				expect(routerPush.calledWith("/two-factor")).to.equal(true);
				
				done();
			}, 1500);
		});
	});
	
	it("sets the login token on success", done => {
		setLoginToken.resetHistory();
		routerPush.resetHistory();
		expect(setLoginToken.called).to.equal(false);
		expect(routerPush.called).to.equal(false);
		
		window.postMessage({
			username: "username",
			token: "token",
		}, "*");
		
		setTimeout(() => {
			expect(setLoginToken.calledWith("username")).to.equal(true);
			expect(routerPush.calledWith("/audit")).to.equal(true);
			
			done();
		}, 10);
	});
});