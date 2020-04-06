<template>
	<div id="authenticatorManage">
		<svg
			aria-hidden="true"
			version="1.1"
			xmlns="http://www.w3.org/2000/svg"
			xmlns:xlink="http://www.w3.org/1999/xlink"
		>
			<defs>
				<symbol
					id="icon-bin2"
					viewBox="0 0 32 32"
				>
					<credit>"bin2" by Keyamoon (IcoMoon - icomoon.io)</credit>
					<path d="M6 32h20l2-22h-24zM20 4v-4h-8v4h-10v6l2-2h24l2 2v-6h-10zM18 4h-4v-2h4v2z" />
				</symbol>
				<symbol
					id="icon-certificate"
					viewBox="0 0 32 32"
				>
					<credit>"certificate" by Yannick Lung (Hawcons - hawcons.com)</credit>
					<path
						d="M13 19.95v0 0c0.619-0.631 1-1.496 1-2.45 0-1.933-1.567-3.5-3.5-3.5s-3.5 1.567-3.5 3.5c0 0.954 0.381 1.818 1 2.45v3.050h-1.995c-1.108 0-2.005-0.895-2.005-2v-13c0-1.11 0.898-2 2.005-2h19.99c1.108 0 2.005 0.895 2.005 2v13c0 1.11-0.898 2-2.005 2h-12.995v-3.050zM9 20.663v4.937l1.5-1.5 1.5 1.5v-4.937c-0.455 0.216-0.963 0.337-1.5 0.337s-1.045-0.121-1.5-0.337v0 0zM7 11v1h18v-1h-18zM16 14v1h9v-1h-9zM19 17v1h6v-1h-6zM10.5 20c1.381 0 2.5-1.119 2.5-2.5s-1.119-2.5-2.5-2.5c-1.381 0-2.5 1.119-2.5 2.5s1.119 2.5 2.5 2.5v0z"
					/>
				</symbol>
				<symbol
					id="icon-plus"
					viewBox="0 0 32 32"
				>
					<credit>"plus" by Keyamoon (IcoMoon - icomoon.io)</credit>
					<path
						d="M31 12h-11v-11c0-0.552-0.448-1-1-1h-6c-0.552 0-1 0.448-1 1v11h-11c-0.552 0-1 0.448-1 1v6c0 0.552 0.448 1 1 1h11v11c0 0.552 0.448 1 1 1h6c0.552 0 1-0.448 1-1v-11h11c0.552 0 1-0.448 1-1v-6c0-0.552-0.448-1-1-1z"
					/>
				</symbol>
			</defs>
		</svg>
	
		<h4 class="card-title mb-2">
			{{ $root.user.authenticators.length ? $t("authenticator.review") : $t("authenticator.add") }}
		</h4>
		<div class="list-group">
			<div
				v-for="authenticator in $root.user.authenticators"
				:key="authenticator.handle"
				class="list-group-item d-flex justify-content-between align-items-center"
			>
				<svg
					:title="
						authenticator.type == 'fido2'
							? $t('authenticator.fido2-title')
							: $t('authenticator.cert-title')
					"
				>
					<use
						:xlink:href="
							'#icon-' +
								(authenticator.type == 'fido2'
									? 'fidoalliance'
									: 'certificate')
						"
					/>
				</svg>
				{{ authenticator.label }}
				<a
					href="#"
					class="text-danger float-right remove-authenticator"
					:title="$t('authenticator.remove')"
					@click="
						removeAuthenticator(authenticator.type, authenticator.userHandle)
					"
				>
					<svg><use xlink:href="#icon-bin2" /></svg>
				</a>
			</div>

			<ValidationObserver
				ref="authCreator"
				v-slot="{ handleSubmit, reset }"
			>
				<form @submit.prevent="handleSubmit(createAuthenticator)">
					<div
						id="add-authenticator-group"
						class="input-group"
					>
						<div class="input-group-prepend col-sm-3">
							<ValidationProvider
								v-slot="{ errors }"
								rules="required"
								name="type"
							>
								<select
									v-model="createType"
									class="custom-select"
									:title="$t('authenticator.choose-type-title')"
								>
									<option
										selected
										disabled
									>
										{{ $t("authenticator.choose") }}
									</option>
									<option value="cert">
										{{ $t("authenticator.choose-cert") }}
									</option>
									<option
										value="fido"
										:disabled="!fidoAvailable"
									>
										{{ $t("confirm.fido2") }}
									</option>
								</select>
								<span
									v-if="errors.length"
									class="badge badge-danger"
								>
									{{ $t("authenticator.fill-choose") }}
								</span>
							</ValidationProvider>
						</div>
						<ValidationProvider
							v-slot="{ errors }"
							name="label"
							class="form-control col-sm-7"
						>
							<input
								v-model="createLabel"
								type="text"
								:placeholder="$t('authenticator.label')"
								pattern="^[\w \-]{1,25}$"
								class="col-sm-12"
								:title="$t('authenticator.label-title')"
								required
							>
							<span
								v-if="errors.length"
								class="badge badge-danger"
							>
								{{ $t("authenticator.fill-label") }}
							</span>
						</ValidationProvider>
						<div
							class="input-group-append col-sm-2"
							:title="$t('authenticator.submit-title')"
						>
							<button
								type="submit"
								class="btn btn-outline-secondary"
							>
								<svg><use xlink:href="#icon-plus" /></svg>
							</button>
						</div>
					</div>
				</form>
			</ValidationObserver>
		</div>
	</div>
</template>
<script>
const base64buffer = require("base64-arraybuffer");

export default {
	name: "AuthenticatorManage",
	data() {
		return {
			createType: null,
			createLabel: "",
			fidoError: 0,
			tempToken: "",
			fidoAvailable: window.PublicKeyCredential,
		};
	},
	methods: {
		removeAuthenticator(type, handle) {
			if (!confirm("Are you sure that you want to delete this authenticator?"))
				return;
			this.$root.apiPost("/authenticator/delete", {
				session: this.$root.user.session,
				handle,
				type,
			})
				.then(() => {
					this.$emit("reload");
				})
				.catch(() => {
					// todo
				});
		},
		createAuthenticator() {
			const that = this;
			switch (this.createType) {
				case "cert":
					this.axios({
						url: this.$root.backend + "/cert/register",
						method: "POST",
						responseType: "blob",
						data: {
							label: this.createLabel,
						},
					}).then(response => {
						const url = window.URL.createObjectURL(new Blob([response.data]));
						const link = document.createElement("a");
						link.href = url;
						link.target = "_blank";
						link.setAttribute("download", this.$root.user.username + ".p12");
						document.body.appendChild(link);
						link.click();
						link.remove();
						
						this.$emit("reload");
					});
					break;
				case "fido":
					this.$root.apiGet("/fido2/register")
						.then(dataRaw => {
							const thisData = dataRaw.data;
							
							this.tempToken = thisData.token;
							const registrationOptions = thisData.options;

							registrationOptions.challenge = base64buffer.decode(
								registrationOptions.challenge
							);
							registrationOptions.user.name = this.$root.user.username;
							registrationOptions.user.displayName = this.$root.user.username;
							registrationOptions.user.id = base64buffer.decode(
								registrationOptions.user.id
							);

							return navigator.credentials.create({
								publicKey: registrationOptions,
							});
						})
						.then(credential => {
							const passableCredential = {
								id: credential.id,
								rawId: base64buffer.encode(credential.rawId),
								response: {
									clientDataJSON: base64buffer.encode(
										credential.response.clientDataJSON
									),
									attestationObject: base64buffer.encode(
										credential.response.attestationObject
									),
								},
								type: credential.type,
							};

							this.$root.apiPost("/fido2/register", {
								token: that.tempToken,
								response: passableCredential,
								label: this.createLabel,
							})
								.then(() => {
									this.$emit("reload");
								})
								.catch(err => {
									this.fidoError = err.response.status;
								})
								.finally(() => {
									this.createType = null;
									this.createLabel = "";
									this.$refs.authCreator.reset();
								});
						})
						.then(() => {})
						.catch(err => {
							console.error(err);
							this.fidoError = 1;
						});
					break;
			}
		},
	},
};
</script>
<style scoped>
.list-group-item > svg {
	font-size: 2em;
}

a.text-danger > svg {
	font-size: 1.5em;
}

#add-authenticator-group input,
#add-authenticator-group .form-control,
#add-authenticator-group button,
#add-authenticator-group select {
	border: 0;
	border-bottom: 1px;
}

#add-authenticator-group {
	border-bottom-left-radius: 0.25rem;
	border-bottom-right-radius: 0.25rem;
	border: 1px solid rgba(0, 0, 0, 0.125);
	border-top: 0;
}

#add-authenticator-group button {
	margin-left: -0.5em;
	border-radius: 0.25rem;
}
</style>
