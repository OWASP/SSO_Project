<template>
	<div class="card-body">
		<div class="col-md-12 text-center">
			<div
class="spinner-border spinner-border-lg"
role="status"
></div>
		</div>
	</div>
</template>

<script>
export default {
	name: "FlowIn",
	beforeMount() {
		if(this.$route.params.id == "saml") {
			// SAML Workflow at /in/saml, where the data is available via query params
			this.$root.apiGet("/saml", {
				SAMLRequest: this.$route.query.SAMLRequest,
				RelayState: this.$route.query.RelayState,
			}).then(token => {
				this.processFeedback(token);
			});
		} else {
			// JWT workflow
			this.$root.apiPost("/flow/in", {
				id: this.$route.params.id,
				d: this.$route.params.data,
			}).then(token => {
				this.processFeedback(token);
			});
		}
	},
	methods: {
		processFeedback(response) {
			if(response.data) {
				if(response.data.username) {
					this.$root.setLoginToken(response.data.username, response.data);
				}
				
				if(response.data.page) {
					sessionStorage.setItem("sso-request", JSON.stringify(response.data.page));
				}
			}
			this.$router.push("/");
			window.location.reload();
		},
	},
};
</script>
