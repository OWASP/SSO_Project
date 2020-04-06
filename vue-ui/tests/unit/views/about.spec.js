import { shallowMount } from "@vue/test-utils";
import { expect } from "chai";
import About from "@/views/about.vue";

const wrapper = shallowMount(About, {
	mocks: {
		$t: key => key,
	},
});

describe("About (View)", () => {
	it("has proper default values", () => {
		expect(wrapper.vm.$data.activeAccordion).to.equal("");
		expect(wrapper.vm.$data.categories).to.be.an("array").and.has.lengthOf.at.least(3);
		
		const firstItem = wrapper.vm.$data.categories[0];
		expect(firstItem).to.have.property("name");
		expect(firstItem).to.have.property("list");
		expect(firstItem.name).to.equal("about.icons");
		
		expect(firstItem.list).to.be.an("array").to.have.lengthOf.at.least(3);
	});
	
	it("can expand and collapse accordion", () => {
		expect(wrapper.vm.$data.activeAccordion).to.equal("");
		
		wrapper.get("button.btn").trigger("click");
		expect(wrapper.vm.$data.activeAccordion).to.not.be.equal("");
		
		wrapper.get("button.btn").trigger("click");
		expect(wrapper.vm.$data.activeAccordion).to.be.equal("");
	});
	
	it("displays title, badge and list", async () => {
		const instanceData = wrapper.vm.$data;
		
		let securityIndex = false;
		for(let i=0;i<instanceData.categories.length;i++) {
			if(instanceData.categories[i].name == "about.security") {
				securityIndex = i;
				break;
			}
		}
		expect(securityIndex).to.not.equal(false);

		instanceData.categories[securityIndex].list = ["test"];
		wrapper.setData(instanceData);
		
		const securityTitle = wrapper.get("#title-about\\.security").text();
		expect(securityTitle).to.equal("about.security");
		
		wrapper.vm.clickAccordion("about.security");
		await wrapper.vm.$nextTick();
		
		expect(wrapper.vm.$data.activeAccordion).to.not.be.equal("");
		
		const bannerText = wrapper.get("div.show#about-about\\.security span.about-banner.badge").text();
		expect(bannerText).to.equal("about.security-banner");
		
		const listText = wrapper.get("div.show#about-about\\.security ul li").text();
		expect(listText).to.equal("test");
	});
});