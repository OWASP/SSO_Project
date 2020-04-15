import { shallowMount } from "@vue/test-utils";
import { expect } from "chai";
import sinon from "sinon";
import AuditLog from "@/components/AuditLog.vue";

const apiGet = sinon.stub(),
	apiPost = sinon.stub();

const page1 = [], page2 = [];
for(let i=0;i<10;i++) {
	const dummyItem = {
		id: i,
		object: "object",
		action: "action",
		country: "country",
		ip: "ip",
	};
	
	(i<5) ? page1.push(dummyItem) : page2.push(dummyItem);
}

apiGet.withArgs("/audit?page=0").resolves({
	data: page1,
});
apiGet.withArgs("/audit?page=1").resolves({
	data: page2,
});
apiPost.resolves({});

const wrapper = shallowMount(AuditLog, {
	mocks: {
		$t: key => key,
		$i18n: {
			locale: "en",
		},
	},
	parentComponent: {
		data() {
			return {
				user: {
					session: "session",
				},
			};
		},
		methods: {
			apiPost,
			apiGet,
		},
	},
	stubs: [
		"country-flag",
	],
});

describe("AuditLog (Component)", () => {
	it("has proper default values", () => {
		expect(wrapper.vm.$data.activeAccordion).to.equal("");
		expect(wrapper.vm.$data.auditPage).to.equal(0);
		expect(wrapper.vm.$data.loading).to.equal(false);
		
		expect(wrapper.emitted("ready").length).to.equal(1);
	});
	
	it("can expand and collapse accordion", () => {
		expect(wrapper.vm.$data.activeAccordion).to.equal("");
		
		wrapper.get("button.btn").trigger("click");
		expect(wrapper.vm.$data.activeAccordion).to.not.equal("");
		
		wrapper.get("button.btn").trigger("click");
		expect(wrapper.vm.$data.activeAccordion).to.equal("");
	});
	
	it("loads log entries", async () => {
		expect(wrapper.vm.$data.auditLogs).to.be.an("array").and.has.lengthOf(5);
		expect(apiGet.calledWith("/audit?page=0")).to.equal(true);
		expect(wrapper.emitted("reload")).to.equal(undefined);
		
		wrapper.get("#loadMoreAudit").trigger("click");
		await wrapper.vm.$nextTick();
		
		expect(wrapper.vm.$data.auditLogs).to.be.an("array").and.has.lengthOf(10);
		expect(wrapper.emitted("reload").length).to.equal(1);
	});
	
	it("closes session", async () => {
		expect(apiPost.called).to.equal(false);
		
		wrapper.get("#closeSessions").trigger("click");
		await wrapper.vm.$nextTick();
		
		expect(apiPost.calledWith("/local/session-clean")).to.equal(true);
		expect(wrapper.vm.$data.auditLogs).to.be.an("array").and.has.lengthOf.most(5);
	});
});