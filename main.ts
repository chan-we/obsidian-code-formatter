import { Plugin } from "obsidian";
import { format } from "prettier";
import * as babelPlugin from "prettier/plugins/babel";
import * as typescriptPlugin from "prettier/plugins/typescript";
import * as prettierPluginEstree from "prettier/plugins/estree";

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

const plugins = [babelPlugin, typescriptPlugin, prettierPluginEstree];

const formatCode = (code: string) => {
	return format(code, {
		semi: false,
		parser: "typescript",
		plugins,
	});
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "format-code",
			name: "Format Code",
			editorCallback(editor, ctx) {
				const doc = editor.getDoc();

				let flag = false;
				let temp = "";
				let start = Number.NaN;
				const promises = [];

				for (let i = 0; i < doc.lineCount(); i++) {
					const line = doc.getLine(i);
					if (line.trim().startsWith("```")) {
						flag = !flag;
						if (flag) {
							start = i;
							continue;
						}

						if (!Number.isNaN(start)) {
							const p = new Promise((resolve) => {
								const index = {
									start: start + 1,
									end: i,
								};

								formatCode(temp).then((res) => {
									resolve({ ...index, code: res });
								});
							});

							promises.push(p);

							temp = "";
							start = Number.NaN;
						}

						continue;
					}

					if (flag) {
						temp += line + "\n";
					}
				}
				let offset = 0;
				Promise.all(promises).then(
					(res: { code: string; start: number; end: number }[]) => {
						res.forEach(({ code, start, end }) => {
							doc.replaceRange(
								code,
								{ line: start + offset, ch: 0 },
								{ line: end + offset, ch: 0 },
							);

							offset +=
								code.split("\n").length - 1 - (end - start);
						});
					},
				);
			},
		});
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
