<template>
	<div class="card-body">
		<h4 class="card-title">
			Register
		</h4>
		<ValidationObserver v-slot="{ invalid }">
			<form @submit.prevent="submit">
				<div
					v-if="!token"
					class="form-group"
				>
					<label for="email">E-Mail Address</label>
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
							required
							autofocus
						>
						<span
							v-if="errors.length"
							class="badge badge-danger"
						>
							Please provide a valid email address
						</span>
					</ValidationProvider>
				</div>

				<div
					v-if="token"
					class="form-group"
				>
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

				<div
					v-if="token"
					class="form-group"
				>
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
					v-if="!token"
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
								I agree to the <a href="#">Terms and Conditions</a>
							</label>
							<span
								v-if="errors.length"
								class="badge badge-danger"
							>
								You need to agree to use this service
							</span>
						</ValidationProvider>
					</div>
				</div>

				<div
					v-if="success === true && !token"
					class="alert alert-success"
				>
					If the email address you entered is not already registered, please
					check your email inbox for a confirmation link!
				</div>
				
				<div
					v-if="error == 400 && token"
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
						Register
					</button>
				</div>
				<div class="mt-4 text-center">
					Already have an account?
					<router-link to="/">
						Back to login
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
