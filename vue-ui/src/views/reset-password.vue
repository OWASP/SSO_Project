<template>
	<div class="card-body">
		<h4 class="card-title">
			{{ $t("router.reset-password") }}
		</h4>
		<ValidationObserver v-slot="{ invalid }">
			<form @submit.prevent="submit">
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
				<div
					v-if="success === false"
					class="alert alert-danger"
				>
					{{ $t("reset-password.error") }}
				</div>
				<div
					v-if="success === true"
					class="alert alert-success"
				>
					{{ $t("reset-password.success") }}
				</div>

				<div class="form-group m-0">
					<button
						type="submit"
						class="btn btn-primary btn-block"
						:disabled="invalid"
					>
						{{ $t("reset-password.reset-password") }}
					</button>
				</div>
				<div class="mt-4 text-center">
					{{ $t("reset-password.remember-password") }}
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
