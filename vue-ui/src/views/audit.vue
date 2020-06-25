<template>
	<div class="card-body">
		<h4 class="card-title mb-2">
			{{ $t("router.review") }}
		</h4>
		<div v-if="!loading">
			<AuditLog ref="loglist"></AuditLog>

			<hr>

			<AuthenticatorManage @reload="loadUser(true)"></AuthenticatorManage>

			<div class="mt-4">
				<div
					v-if="
						$root.ssoPage && 
							$root.ssoPage.hasOwnProperty('username') &&
							$root.ssoPage.username != $root.user.username
					"
					class="alert alert-danger"
				>
					{{ $t("audit.wrong-account", { username: $root.ssoPage.username, website: $root.ssoPage.name }) }}
				</div>
				<div
					v-if="
						$root.ssoPage && ssoOutError
					"
					class="alert alert-danger"
				>
					{{ $t("audit.sso-out-error", { website: $root.ssoPage.name }) }}
				</div>
				<button
					id="logout"
					type="button"
					class="btn btn-warning"
					@click="$root.logout"
				>
					&laquo; {{ $t("audit.logout") }}
				</button>
				<button
					v-if="
						!ssoOutError && $root.ssoPage && $root.ssoPage.pageId && 
							(!$root.ssoPage.hasOwnProperty('username') ||
								$root.ssoPage.username == $root.user.username)
					"
					id="flowLeaveButton"
					type="button"
					class="btn btn-primary float-right"
					@click="flowOut"
				>
					{{ $t("audit.continue-page", { website: $root.ssoPage.name }) }} &raquo;
				</button>
			</div>
		</div>
		
		<form
			v-if="$root.ssoPage && $root.ssoPage.pageId"
			id="ssoFlowOutForm"
			ref="flowOut"
			:action="redirect"
			method="POST"
			class="hidden"
		>
			<input
				v-if="$root.ssoPage.flowType == 'jwt'"
				type="hidden"
				name="token"
				:value="jwtToken"
			>
			
			<input
				v-if="$root.ssoPage.flowType == 'saml'"
				type="hidden"
				name="SAMLResponse"
				:value="SAMLResponse"
			>
			<input
				v-if="$root.ssoPage.flowType == 'saml'"
				type="hidden"
				name="RelayState"
				:value="RelayState"
			>
		</form>

		<div
			v-if="loading"
			class="col-md-12 text-center mt-4"
		>
			<div
				class="spinner-border spinner-border-lg"
				role="status"
			></div>
		</div>
	</div>
</template>
<script>
export default {
	name: "Audit",
	components: {
		"AuditLog": () => import("@/components/AuditLog"),
		"AuthenticatorManage": () => import("@/components/AuthenticatorManage"),
	},
	data() {
		return {
			loading: true,
			redirect: null,
			ssoOutError: false,
			
			jwtToken: "",
			SAMLResponse: "",
			RelayState: "",
		};
	},
	mounted() {
		this.$nextTick(() => {
			this.loadUser(true);
		});
	},
	methods: {
		loadUser(blocking) {
			if (!blocking) {
				blocking = false;
			}

			this.auditPage = 0;
			if (blocking) this.loading = true;
			
			const runPromises = [this.$root.getMe()];
			if(this.$refs.loglist) runPromises.push(this.$refs.loglist.reloadAudits());
			
			Promise.all(runPromises)
				.then(() => {
					if (blocking) this.loading = false;
				})
				.catch(() => {
					this.$router.push("/");
				});
		},

		flowOut() {
			this.loading = true;
			
			this.$root.apiPost("/flow/out")
				.then(response => {
					const data = response.data;
					
					this.redirect = data.redirect;
					if(this.$root.ssoPage.flowType == "jwt") {
						this.jwtToken = data.token;
					} else if(this.$root.ssoPage.flowType == "saml") {
						this.SAMLResponse = data.SAMLResponse;
						this.RelayState = data.RelayState;
					}
					
					if(!window.Cypress) {
						this.$nextTick(() => {
							this.$refs.flowOut.submit();
						});
					}
				}).catch(err => {
					this.loading = false;
					this.ssoOutError = true;
				});
		},
	},
};
</script>
