<template>
	<div class="card-body">
		<h4 class="card-title">
			{{ $t("router.register") }}
		</h4>
		<ValidationObserver v-slot="{ invalid }">
			<form @submit.prevent="submit">
				<div
					v-if="!token"
					class="form-group"
				>
					<label for="email">{{ $t("general.email-address") }}</label>
					<ValidationProvider
						v-slot="{ errors }"
						rules="max:255"
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

				<div
					v-if="token"
					class="form-group"
				>
					<label for="password">{{ $t("general.password") }}</label>
					<ValidationProvider
						v-slot="{ errors }"
						rules="required|min:8"
						name="password"
					>
						<input
							id="password"
							v-model="password"
							type="password"
							class="form-control"
							autocomplete="new-password"
						>
						<span
							v-if="errors.length"
							class="badge badge-danger"
						>
							{{ $t("login.fill-password") }}
						</span>
					</ValidationProvider>
				</div>

				<div
					v-if="token"
					class="form-group"
				>
					<label for="confirm">{{ $t("change-password.confirm-password") }}</label>
					<ValidationProvider
						v-slot="{ errors }"
						rules="required|confirmed:password"
						name="confirm"
					>
						<input
							id="confirm"
							v-model="confirm"
							type="password"
							class="form-control"
							autocomplete="new-password"
						>
						<span
							v-if="errors.length"
							class="badge badge-danger"
						>
							{{ $t("change-password.fill-confirmation") }}
						</span>
					</ValidationProvider>
				</div>

				<div
					v-if="!token && termsLink != '#'"
					class="form-group"
				>
					<div class="custom-checkbox custom-control">
						<ValidationProvider
							v-slot="{ errors }"
							:rules="{ required: { allowFalse: false } }"
							name="toc"
						>
							<input
								id="agree"
								v-model="agreeToC"
								type="checkbox"
								class="custom-control-input"
								required
							>
							<label
								for="agree"
								class="custom-control-label"
							>
								<a
									id="termsLink"
									:href="termsLink"
									target="_toc"
									rel="noopener noreferrer"
								>{{ $t("register.toc-agree-label") }}</a>
							</label>
							<span
								v-if="errors.length"
								class="badge badge-danger"
							>
								{{ $t("register.fill-toc") }}
							</span>
						</ValidationProvider>
					</div>
				</div>

				<div
					v-if="success === true && !token"
					class="alert alert-success"
				>
					{{ $t("register.success") }}
				</div>
				
				<div
					v-if="error == 400 && token"
					class="alert alert-danger"
				>
					{{ $t("register.400") }}
				</div>

				<div class="form-group m-0">
					<button
						type="submit"
						class="btn btn-primary btn-block"
						:disabled="invalid"
					>
						{{ $t("register.register") }}
					</button>
				</div>
				<div class="mt-4 text-center">
					{{ $t("register.already-account") }}
					<router-link to="/">
						{{ $t("register.switch-login") }}
					</router-link>
				</div>
			</form>
		</ValidationObserver>
	</div>
</template>

<script>
export default {
	name: "Register",
	data() {
		return {
			email: "",
			password: "",
			confirm: "",
			agreeToC: false,
			token: this.$route.params.token,
			success: null,
			error: 0,
		};
	},
	computed: {
		termsLink() {
			const termsObj = this.$root.ssoPage.terms || this.$root.defaultPage.terms;
			if(!termsObj) {
				return "#";
			}
			
			const currentLocale = this.$root.$i18n.locale;
			const fallbackLocale = this.$root.$i18n.fallbackLocale;
			if(typeof termsObj == "object") {
				if(termsObj.hasOwnProperty(currentLocale)) {
					return termsObj[currentLocale];
				} else if(termsObj.hasOwnProperty(fallbackLocale)) {
					return termsObj[fallbackLocale];
				} else {
					return "#";
				}
			} else {
				return termsObj;
			}
		},
	},
	methods: {
		submit() {
			if (!this.token) {
				this.$root.apiPost("/local/register", {
					email: this.email,
				})
					.then(() => {
						this.success = true;
					})
					.catch(err => {
						this.success = false;
						this.error = err.response.status;
					});
			} else {
				this.$root.apiPost("/local/activate", {
					token: this.token,
					password: this.password,
				})
					.then(token => {
						this.$root.setLoginToken(token.data.username, token.data);
					
						this.$router.push("/audit");
					})
					.catch(err => {
						this.success = false;
						this.error = err.response.status;
					});
			}
		},
	},
};
</script>
