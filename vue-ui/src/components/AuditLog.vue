<template>
	<div id="auditLog">
		<svg
			aria-hidden="true"
			version="1.1"
			xmlns="http://www.w3.org/2000/svg"
			xmlns:xlink="http://www.w3.org/1999/xlink"
		>
			<defs>
				<symbol
					id="icon-flag"
					viewBox="0 0 32 32"
				>
					<credit>"flag" by Yannick Lung (Hawcons - hawcons.com)</credit>
					<path
						d="M8 10.494v18.5h1v-14.502c1.266-0.48 3.689-0.94 7 0.502 5.023 2.187 8 0 8 0v-11c0 0-2.976 2.236-8 0s-8 0-8 0v6.5z"
					/>
				</symbol>
			</defs>
		</svg>
	
		<div
			class="audit-logs"
			role="tablist"
		>
			<div 
				v-if="!auditLogs.length && loading"
				class="loading-logs"
			>
				<div
					v-for="index in 5"
					:key="index"
					class="row accordion-row mb-1"
				>
					<div class="col-sm-12">
						<div
							class="btn btn-default btn-block py-1 px-2 text-left"
							href="#"
						>
							<div
								class="spinner-grow spinner-grow-sm"
								role="status"
							></div>
							{{ $t("general.loading") }}
						</div>
					</div>
				</div>
			</div>
			<div
				v-if="auditLogs.length"
				class="data-logs"
			>
				<div
					v-for="log in auditLogs"
					:key="log.id"
					class="row accordion-row mb-1"
				>
					<div class="col-sm-12">
						<button
							type="button"
							class="btn btn-block btn-sm btn-secondary py-1 px-2 text-left"
							@click="clickAccordion(log.id)"
						>
							{{ $t("audit-log.titles." + log.object + "-" + log.action) }}
							<country-flag
								v-if="log.country"
								:country="log.country"
								size="normal"
								class="float-right"
								:title="log.ip"
							></country-flag>
						</button>
						<div
							:id="'audit-' + log.id"
							class="collapse"
							:class="{show: activeAccordion == log.id}"
							role="tabpanel"
						>
							<div class="card-body py-1">
								<p class="card-text">
									{{ $t("audit-log.messages." + log.object + "-" + log.action, { attribute: log.attribute1 }) }}
									{{ $t("audit-log.meta", { date: (new Date(log.created).toLocaleString($i18n.locale)), IP: log.ip }) }}
									<a
										href="#"
										class="btn btn-link text-danger float-right"
										:title="$t('audit-log.report')"
									>
										<svg><use xlink:href="#icon-flag" /></svg>
									</a>
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div class="row accordion-row">
			<div class="col-sm-12">
				<div
					class="d-flex btn-group btn-group-xs"
					role="group"
				>
					<button
						id="loadMoreAudit"
						class="btn btn-info py-1 px-2"
						type="button"
						@click="loadMoreAudit"
					>
						{{ $t("audit-log.load-more") }}
					</button>
					<button
						id="closeSessions"
						class="btn btn-warning py-1 px-2"
						type="button"
						@click="closeSessions"
					>
						{{ $t("audit-log.close-sessions") }}
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
export default {
	name: "AuditLog",
	components: {
		"country-flag": () => import("vue-country-flag"),
	},
	data() {
		return {
			auditLogs: [],
			loading: true,
			auditPage: 0,
			activeAccordion: "",
		};
	},
	mounted() {
		this.loadAudits().then(() => {});
	},
	methods: {
		closeSessions() {
			this.$root.apiPost("/local/session-clean", {
				session: this.$root.user.session,
			})
				.then(() => {
					return this.reloadAudits();
				})
				.catch(() => {
					// todo
				});
		},
		loadAudits() {
			this.loading = true;
			return new Promise((resolve, reject) => {
				this.$root.apiGet("/audit?page=" + this.auditPage)
					.then(response => {
						if (this.auditPage == 0) this.auditLogs = [];
						this.auditLogs = this.auditLogs.concat(response.data);
						this.$emit("ready");
						resolve();
					})
					.catch(() => {
						reject();
					}).finally(() => {
						this.loading = false;
					});
			});
		},
		loadMoreAudit() {
			this.auditPage++;
			this.$emit("reload");
			this.loadAudits()
				.then(() => {})
				.catch(() => {
					this.auditPage--;
				});
		},
		reloadAudits() {
			this.auditPage = 0;
			return this.loadAudits();
		},
		clickAccordion(newId) {
			this.activeAccordion = (this.activeAccordion === newId) ? "" : newId;
		},
	},
};
</script>
<style scoped>
.accordion-row .normal-flag {
	margin-top: -20px;
}

.audit-logs {
	overflow-y: auto;
	overflow-x: hidden;
	max-height: 25em;
}
</style>
