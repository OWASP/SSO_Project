<template>
	<div class="card-body">
		<h4 class="card-title">
		{{ $t("router.login") }}
	</h4>
		<ValidationObserver
			v-if="!loading"
			v-slot="{ invalid }"
		>
			<form @submit.prevent="submit">
				<div
					v-if="error == 404"
					class="alert alert-danger"
				>
					{{ $t("login.404") }}
				</div>

				<div class="form-group">
					<label for="email">{{ $t("general.email-address") }}</label>
					<ValidationProvider
						v-slot="{ errors }"
						name="Email"
					>
						<input
							id="email"
							v-model="email"
							type="email"
							class="form-control"
							autocomplete="username"
							required
							autofocus
						>
						<span
							v-if="errors.length"
							class="badge badge-danger"
						>
							{{ $t("login.fill-email") }}
						</span>
					</ValidationProvider>
				</div>

				<div class="form-group">
					<label
						for="password"
					>
						{{ $t("general.password") }}
						<router-link
							to="/reset-password"
							class="float-right"
						>
							{{ $t("login.reset-password") }}
						</router-link>
					</label>
					<ValidationProvider
						v-slot="{ errors }"
						rules="required|min:8|max:255"
						name="Password"
					>
						<input
							id="password"
							v-model="password"
							type="password"
							class="form-control"
							autocomplete="current-password"
						>
						<span
							v-if="errors.length"
							class="badge badge-danger"
						>
							{{ $t("login.fill-password") }}
						</span>
					</ValidationProvider>
				</div>

				<div class="form-group m-0">
					<button
						type="submit"
						class="btn btn-primary btn-block"
						:disabled="invalid"
					>
						{{ $t("login.login") }}
					</button>
				</div>
				<div class="mt-4 text-center">
					{{ $t("login.no-account") }}
					<router-link to="/register">
						{{ $t("login.register") }}
					</router-link>
				</div>
			</form>
		</ValidationObserver>

		<div
			v-if="loading"
			class="col-md-12 text-center"
		>
			<div
				class="spinner-border spinner-border-lg"
				role="status"
			></div>
		</div>
		
		<iframe
			ref="certFrame"
			name="certFrame"
			class="hidden"
			@load="certFrameLoad"
		></iframe>
		<form
			ref="certForm"
			:action="$root.backend + '/cert/login'"
			target="certFrame"
			method="POST"
			class="hidden"
		>
			<input
				v-if="$root.authToken && $root.authToken.token"
				type="hidden"
				name="authorizationToken"
				:value="$root.authToken.token"
			>
			<input
				v-if="$root.ssoPage && $root.ssoPage.token"
				type="hidden"
				name="token"
				:value="$root.ssoPage.token"
			>
		</form>
	</div>
</template>

<script>
export default {
	name: "Login",
	data() {
		return {
			email: "",
			password: "",
			loading: true,
			error: 0,
			certTimeout: null,
		};
	},
	beforeMount() {
		this.routeUser();
	},
	mounted() {
		window.addEventListener("message", event => {
			if(!event.data || event.data.type /*Webpack */) return;
			if(event.data.token) {
				clearTimeout(this.certTimeout);
				this.$root.setLoginToken(event.data.username, event.data);
				
				this.$router.push("/audit");
			} else {
				console.warn("Received unknown message", event.data);
			}
		}, false);
	},
	methods: {
		submit() {
			this.loading = true;

			this.$root.apiPost("/local/login", {
				username: this.email,
				password: this.password,
			})
				.then(token => {
					this.$root.setLoginToken(token.data.username, token.data);
					
					this.routeUser();
				})
				.catch(err => {
					console.error(err);
					this.error = err.response.status;
					this.loading = false;
				});
		},
		routeUser() {
			if(!this.$root.authToken) {
				this.loading = false;
				return;
			}

			this.$root
				.getMe()
				.then(() => {
					this.$refs.certForm.submit();
				})
				.catch(() => {
					this.loading = false;
					this.$root.changeUser(this.$root.emptyUser);
				});
		},
		certFrameLoad() {
			// If the certificate login fails, there will be no message posted and it can't proceed
			// This is why we here need to detect when the page has finished loading and there was no message
			if(this.$root.user.id) {
				this.certTimeout = setTimeout(() => {
					this.$router.push(
						this.$root.user.isAuthenticated ? "/audit" : "/two-factor"
					);
				}, 1000);
			}
		},
	},
};
</script>
