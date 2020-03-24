<template>
	<div class="card-body">
		<h4 class="card-title">
			Reset password
		</h4>
		<ValidationObserver v-slot="{ invalid }">
			<form @submit.prevent="submit">
				<div class="form-group">
					<label for="email">E-Mail Address</label>
					<ValidationProvider
						v-slot="{ errors }"
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
					v-if="success === false"
					class="alert alert-danger"
				>
					An error occured - please try again later!
				</div>
				<div
					v-if="success === true"
					class="alert alert-success"
				>
					If the email address you entered is known, please check your email
					inbox for a password reset link!
				</div>

				<div class="form-group m-0">
					<button
						type="submit"
						class="btn btn-primary btn-block"
						:disabled="invalid"
					>
						Reset password
					</button>
				</div>
				<div class="mt-4 text-center">
					Remember you password? 
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
	name: "ResetPassword",
	data() {
		return {
			email: "",
			success: null,
		};
	},
	methods: {
		submit() {
			this.$root.apiPost("/local/change-request", {
				email: this.email,
			})
				.then(() => {
					this.success = true;
				})
				.catch(() => {
					this.success = false;
				});
		},
	},
};
</script>
