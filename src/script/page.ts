export default abstract class Page {
	subPage: SubPage;

	protected constructor(subPages: SubPage[]) {
		const href = location.href;

		for (const sp of subPages) {
			if (sp.doesMatch(href)) {
				this.subPage = sp;
				return;
			}
		}

		throw new Error("No subpage matched!");
	}

	async start() {
		await this.actualStart();
		await this.subPage.onStart();
	}

	protected abstract async actualStart(): Promise<void>;
}

export abstract class SubPage {
	abstract doesMatch(href: string): boolean;

	abstract async onStart(): Promise<void>;
}
