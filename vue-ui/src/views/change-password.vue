<template>
	<div class="card-body">
		<h4 class="card-title">
			{{ $t("router.change-password") }}
		</h4>
		<ValidationObserver v-slot="{ invalid }">
			<form @submit.prevent="submit">
				<div class="form-group">
					<label for="token">
						{{ $t("change-password.token") }}
					</label>
					<ValidationProvider
						v-slot="{ errors }"
						rules="min:60|max:60"
						name="token"
					>
						<input
							id="token"
							v-model="token"
							type="text"
							class="form-control"
							:disabled="tokenFromUrl"
							required
						>
						<span
							v-if="errors.length"
							class="badge badge-danger"
						>
							{{ $t("change-password.fill-token") }}
						</span>
					</ValidationProvider>
				</div>

				<div class="form-group">
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
						>
						<span
							v-if="errors.length"
							class="badge badge-danger"
						>
							{{ $t("login.fill-password") }}
						</span>
					</ValidationProvider>
				</div>

				<div class="form-group">
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
					v-if="error == 400"
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
						{{ $t("change-password.submit") }}
					</button>
				</div>
			</form>
		</ValidationObserver>
	</div>
</template>

<script>
export default {
	name: "ChangePassword",
	data() {
		return {
			token: this.$route.params.token,
			password: "",
			confirm: "",
			error: 0,
		};
	},
	computed: {
		tokenFromUrl() {
			return this.$route.params.token.length == 60;
		},
	},
	methods: {
		submit() {
			this.$root.apiPost("/local/change", {
				token: this.token,
				password: this.password,
			})
				.then(token => {
					this.$root.setLoginToken(token.data.username, token.data);
				
					this.$router.push("/audit");
				})
				.catch(err => {
					this.error = err.response.status;
				});
		},
	},
};
</script>
