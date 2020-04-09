<template>
	<div class="card-body">
		<h4 class="card-title">
			{{ $t("router.confirm") }}
		</h4>

		<svg
			aria-hidden="true"
			version="1.1"
			xmlns="http://www.w3.org/2000/svg"
			xmlns:xlink="http://www.w3.org/1999/xlink"
		>
			<defs>
				<symbol
					id="icon-checkmark"
					viewBox="0 0 32 32"
				>
					<credit>"checkmark" by Keyamoon (IcoMoon - icomoon.io)</credit>
					<path d="M27 4l-15 15-7-7-5 5 12 12 20-20z" />
				</symbol>
				<symbol
					id="icon-cross"
					viewBox="0 0 32 32"
				>
					<credit>"cross" by Keyamoon (IcoMoon - icomoon.io)</credit>
					<path
						d="M31.708 25.708c-0-0-0-0-0-0l-9.708-9.708 9.708-9.708c0-0 0-0 0-0 0.105-0.105 0.18-0.227 0.229-0.357 0.133-0.356 0.057-0.771-0.229-1.057l-4.586-4.586c-0.286-0.286-0.702-0.361-1.057-0.229-0.13 0.048-0.252 0.124-0.357 0.228 0 0-0 0-0 0l-9.708 9.708-9.708-9.708c-0-0-0-0-0-0-0.105-0.104-0.227-0.18-0.357-0.228-0.356-0.133-0.771-0.057-1.057 0.229l-4.586 4.586c-0.286 0.286-0.361 0.702-0.229 1.057 0.049 0.13 0.124 0.252 0.229 0.357 0 0 0 0 0 0l9.708 9.708-9.708 9.708c-0 0-0 0-0 0-0.104 0.105-0.18 0.227-0.229 0.357-0.133 0.355-0.057 0.771 0.229 1.057l4.586 4.586c0.286 0.286 0.702 0.361 1.057 0.229 0.13-0.049 0.252-0.124 0.357-0.229 0-0 0-0 0-0l9.708-9.708 9.708 9.708c0 0 0 0 0 0 0.105 0.105 0.227 0.18 0.357 0.229 0.356 0.133 0.771 0.057 1.057-0.229l4.586-4.586c0.286-0.286 0.362-0.702 0.229-1.057-0.049-0.13-0.124-0.252-0.229-0.357z"
					/>
				</symbol>
			</defs>
		</svg>

		<div
			v-if="!loading"
			class="row mb-3"
		>
			<div class="col-md-6">
				<div
					id="confirmFido"
					class="choice"
					:class="{ unavailable: !fidoAvailable }"
					@click="confirmFido"
				>
					<div class="icon">
						<svg>
							<use
								:xlink:href="
									'#icon-' + (!fidoAvailable ? 'cross' : 'fidoalliance')
								"
							/>
						</svg>
					</div>
					<h6>{{ $t("confirm.fido2") }}</h6>
				</div>
			</div>
			<div class="col-md-6">
				<div
					id="confirmEmail"
					class="choice"
					:class="{ done: emailClicked }"
					@click="confirmEmail"
				>
					<div class="icon">
						<svg>
							<use
								:xlink:href="
									'#icon-' + (emailClicked ? 'checkmark' : 'envelope')
								"
							/>
						</svg>
					</div>
					<h6>{{ $t("confirm.email") }}</h6>
				</div>
			</div>
		</div>

		<div
			v-if="loading"
			class="col-md-12 text-center mb-3"
		>
			<div
				class="spinner-border spinner-border-lg"
				role="status"
			></div>
		</div>

		<div class="row mb-2">
			<div class="col-md-12">
				<div
					v-if="emailClicked"
					class="alert alert-success"
				>
					{{ $t("confirm.success") }}
				</div>
				<div
					v-if="emailError == 400"
					class="alert alert-danger"
				>
					{{ $t("confirm.400") }}
				</div>
				<div
					v-if="fidoError == 401"
					class="alert alert-danger"
				>
					{{ $t("confirm.401") }}
				</div>
			</div>
		</div>

		<div class="text-center">
			{{ $t("confirm.wrong-account") }}
			<a
				id="logout"
				href="#"
				@click="$root.logout"
			>
				{{ $t("audit.logout") }}
			</a>
		</div>
	</div>
</template>
<script>
const base64buffer = require("base64-arraybuffer");

export default {
	name: "TwoFactorAuth",
	data() {
		return {
			emailClicked: false,
			fidoAvailable: window.PublicKeyCredential,
			fidoError: 0,
			emailError: 0,
			loading: true,
			tempToken: "",
		};
	},
	beforeMount() {
		this.initTwoFa();
	},
	methods: {
		initTwoFa() {
			if (!this.$root.user.id && this.fidoAvailable) {
				this.$root
					.getMe()
					.then(() => {
						this.fidoAvailable =
							this.$root.user.authenticators.filter(item => item.type == "fido2")
								.length > 0;

						if (this.$root.user.isAuthenticated) {
							return this.$router.push("/audit");
						}

						if (this.$route.params.token) {
							this.$root.apiGet("/email-confirm", {
								token: this.$route.params.token,
								action: "login",
							})
								.then(token => {
									this.$root.setLoginToken(token.data.username, token.data);
								
									this.$router.push("/audit");
								})
								.catch(err => {
									console.error(err);
									this.emailError = err.response.status;
									this.loading = false;
								});
						} else {
							this.loading = false;
						}
					})
					.catch(() => {
						this.$root.logout();
					});
			} else {
				this.fidoAvailable =
					this.$root.user.authenticators.filter(item => item.type == "fido2")
						.length > 0;
				this.loading = false;
			}
		},
		confirmFido() {
			if (!this.fidoAvailable) return;

			this.$root.apiGet("/fido2/login")
				.then(dataRaw => {
					this.tempToken = dataRaw.data.token;
					const loginOptions = dataRaw.data.options;

					loginOptions.challenge = base64buffer.decode(loginOptions.challenge);
					loginOptions.allowCredentials.forEach((item, i, array) => {
						array[i].id = base64buffer.decode(item.id);
					});

					return navigator.credentials.get({ publicKey: loginOptions });
				})
				.then(credential => {
					const passableCredential = {
						id: credential.id,
						rawId: base64buffer.encode(credential.rawId),
						response: {
							clientDataJSON: base64buffer.encode(
								credential.response.clientDataJSON
							),
							authenticatorData: base64buffer.encode(
								credential.response.authenticatorData
							),
							signature: base64buffer.encode(credential.response.signature),
							userHandle: base64buffer.encode(credential.rawId), //base64buffer.encode(credential.response.userHandle),
						},
						type: credential.type,
					};

					this.$root.apiPost("/fido2/login", {
						response: passableCredential,
						token: this.tempToken,
					})
						.then(token => {
							this.$root.setLoginToken(token.data.username, token.data);
						
							this.$router.push("/audit");
						})
						.catch(err => {
							this.fidoError = err.response.status;
						});
				})
				.catch(err => {
					console.error(err);
				});
		},
		confirmEmail() {
			if (this.emailClicked) return;
			this.emailClicked = true;

			this.$root.apiGet("/local/email-auth").then(() => {});
		},
	},
};
</script>
<style scoped>
.choice {
	text-align: center;
	cursor: pointer;
	margin-top: 20px;
}

.choice .icon {
	text-align: center;
	vertical-align: middle;
	height: 116px;
	width: 116px;
	border-radius: 50%;
	color: #999999;
	margin: 0 auto 20px;
	border: 4px solid #cccccc;
	position: relative;
}

.choice svg {
	font-size: 3em;
	line-height: 111px;
	position: absolute;
	top: calc(50% - 0.5em);
	left: calc(50% - 0.5em);
	color: #cccccc;
}

.choice .icon,
.choice svg,
.choice h6 {
	transition: all 0.3s;
	-webkit-transition: all 0.3s;
}

.choice:hover .icon,
.choice:hover .icon svg,
.choice:hover h6 {
	border-color: #007bff;
	color: #007bff;
	font-weight: bold;
}

.choice.done .icon,
.choice.done .icon svg,
.choice.done h6 {
	border-color: #63cc00;
	color: #63cc00;
	font-weight: bold;
}

.choice.unavailable .icon,
.choice.unavailable .icon svg,
.choice.unavailable h6 {
	border-color: #cc0300;
	color: #cc0300;
	font-weight: bold;
}

h6,
.h6 {
	font-size: 0.9em;
	text-transform: uppercase;
}
</style>
