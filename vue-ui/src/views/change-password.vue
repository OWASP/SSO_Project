<template>
	<div class="card-body">
		<h4 class="card-title">
			Change Password
		</h4>
		<ValidationObserver v-slot="{ invalid }">
			<form @submit.prevent="submit">
				<div class="form-group">
					<label for="token">Email token</label>
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
							Enter the full confirmation token that you received via
							email
						</span>
					</ValidationProvider>
				</div>

				<div class="form-group">
					<label for="password">Password</label>
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
							Password policy: Minimum 8 characters
						</span>
					</ValidationProvider>
				</div>

				<div class="form-group">
					<label for="confirm">Confirm Password</label>
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
							The passwords do not match
						</span>
					</ValidationProvider>
				</div>

				<div
					v-if="error == 400"
					class="alert alert-danger"
				>
					Your password was not sufficiently secure or you are resetting from a
					different network than you requested it from.
				</div>

				<div class="form-group m-0">
					<button
						type="submit"
						class="btn btn-primary btn-block"
						:disabled="invalid"
					>
						Apply Changes
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
