import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import i18n from "./i18n";

import axios from "axios";

import "bootstrap/dist/css/bootstrap.min.css";
import "./plugins/vee-validate";

Vue.config.productionTip = false;
Vue.prototype.axios = axios;

const emptyUser = {
	authenticators: [],
	id: null,
	isAuthenticated: false,
	username: null,
	session: null,
	flow: null,
};

// Only used if the default page or SSO page design can't load
const fallbackPage = {
	name: "OWASP SSO",
	branding: {
		backgroundColor: "#f7f9fb",
		fontColor: "#888",
		legalName: "OWASP Foundation",
		privacyPolicy: "",
		logo: "https://owasp.org/assets/images/logo.png",
	},
};

new Vue({
	router,
	i18n,
	data: {
		backend: process.env.VUE_APP_BACKEND,
		user: emptyUser,
		emptyUser,
		authToken: null,
		ssoPage: {
			name: "",
			branding: {
				backgroundColor: "#f7f9fb",
				fontColor: "#888",
				legalName: "",
				privacyPolicy: "",
				logo: "about:blank",
			},
		},
	},
	async created() {
		const users = this.listLoginToken();
		if(users.length == 1) {
			this.useLoginToken(users[0]);
		}
		
		const pageLoad = localStorage.getItem("sso-request");
		if(pageLoad) {
			this.ssoPage = JSON.parse(pageLoad);
			this.axios.defaults.headers.common["X-SSO-Token"] = this.ssoPage.token;
		} else if(this.ssoPage.name == "") {
			let defaultLoad = sessionStorage.getItem("default-page");
			
			if(!defaultLoad) {
				// First visit, doesn't have default styling of SSO yet
				const defaultPage = await this.apiGet("/default-page");
				sessionStorage.setItem("default-page", JSON.stringify(defaultPage.data));
				defaultLoad = defaultPage.data;
			} else {
				defaultLoad = JSON.parse(defaultLoad);
			}
			this.ssoPage = defaultLoad;
		}
		
		if(!this.ssoPage || !this.ssoPage.name || this.ssoPage.name == "") {
			this.ssoPage = fallbackPage;
		}
		
		document.body.style.backgroundColor = this.ssoPage.branding.backgroundColor;
	},
	methods: {
		changeUser(newUser) {
			if(!newUser.id && this.user.username) {
				this.signOutToken();
				this.authToken = null;
			}
			
			this.user = newUser;
		},
		logout() {
			this.changeUser(this.emptyUser);
			this.$router.push("/");
		},
		setLoginToken(email, data) {
			const retSet = localStorage.setItem(email, JSON.stringify(data));
			const currentUsers = this.listLoginToken();
			if(!currentUsers.includes(email)) {
				currentUsers.push(email);
				localStorage.setItem("users", JSON.stringify(currentUsers));
			}
			
			this.useLoginToken(email);
			return retSet;
		},
		listLoginToken() {
			return JSON.parse(localStorage.getItem("users")) || [];
		},
		removeLoginToken(email) {
			const currentUsers = this.listLoginToken().filter(x => x != email);
			localStorage.setItem("users", JSON.stringify(currentUsers));
			
			return localStorage.removeItem(email);
		},
		getLoginTokenData(email) {
			return JSON.parse(localStorage.getItem(email));
		},
		useLoginToken(email) {
			this.authToken = this.getLoginTokenData(email);
			this.axios.defaults.headers.common["Authorization"] = "Bearer "+this.authToken.token;
		},
		signOutToken() {
			let tokenUser = this.user.username ? this.user.username : this.listLoginToken()[0];
			this.removeLoginToken(tokenUser);
			delete this.axios.defaults.headers.common["Authorization"];
			delete this.axios.defaults.headers.common["X-SSO-Token"];
		},
		getMe() {
			return new Promise((resolve, reject) => {
				this.apiGet("/me")
					.then(response => {
						this.changeUser(response.data);
						resolve(response.data);
					})
					.catch(() => {
						if(this.authToken) {
							this.signOutToken();
						}
						
						reject();
					});
			});
		},
		apiGet(path, data) {
			if(typeof data == "undefined") data = null;
			return this.axios
				.get(this.$root.backend + path, {
					params: data,
				});
		},
		apiPost(path, data) {
			return this.axios
				.post(this.$root.backend + path, data);
		},
	},
	render: function(h) {
		return h(App);
	},
}).$mount("#app");
