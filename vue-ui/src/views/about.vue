<template>
	<div class="card-body">
		<h4 class="card-title">
			{{ $t("router.about") }}
		</h4>
		
		<div
			class="audit-logs"
			role="tablist"
		>
			<div
				v-for="category in categories"
				:key="category.name"
				class="row accordion-row mb-1"
			>
				<div class="col-sm-12">
					<button
						:id="'title-' + category.name"
						type="button"
						class="btn btn-block btn-sm btn-primary py-1 px-2 text-left"
						@click="clickAccordion(category.name)"
					>
						{{ category.name }}
					</button>
					<div
						:id="'about-' + category.name"
						class="collapse"
						:class="{show: activeAccordion == category.name}"
						role="tabpanel"
					>
						<div class="py-1">
							<span
								v-if="category.hasOwnProperty('banner')"
								class="badge badge-info about-banner"
							>
								{{ category.banner }}
							</span>
							
							<ul
								v-if="category.list.length"
							>
								<li
									v-for="(item, index) in category.list"
									:key="index"
								>
									{{ item }}
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	name: "About",
	data() {
		return {
			activeAccordion: "",
			categories: [
				{
					name: this.$t("about.icons"),
					list: [
						"Dave Gandy (FontAwesome - fontawesome.com)",
						"Keyamoon (IcoMoon - icomoon.io)",
						"Yannick Lung (Hawcons - hawcons.com)",
						"simpleicons.org",
					],
				},{
					name: this.$t("about.opensource"),
					list: [
						"Muhamad Nauval Azhar (github.com/nauvalazhar)",
						"Ackermann Yuriy (github.com/herrjemand)",
					],
				},{
					name: this.$t("about.security"),
					banner: this.$t("about.security-banner"),
					list: [],
				},
			],
		};
	},
	methods: {
		clickAccordion(newId) {
			this.activeAccordion = (this.activeAccordion === newId) ? "" : newId;
		},
	},
};
</script>
<style scoped>
span.badge.about-banner {
	white-space: break-spaces;
}
</style>
