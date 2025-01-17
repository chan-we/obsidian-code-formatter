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
				for (let i = 0; i < doc.lineCount(); i++) {
					const line = doc.getLine(i);
					if (line.trim().startsWith("```")) {
						flag = !flag;
						if (flag) {
							start = i;
							continue;
						}

						if (!Number.isNaN(start)) {
							formatCode(temp).then((res) => {
								doc.replaceRange(
									res,
									{ line: start + 1, ch: 0 },
									{ line: i, ch: 0 },
								);
								temp = "";
								start = Number.NaN;
							});
						}

						continue;
					}

					if (flag) {
						temp += line + "\n";
					}
				}
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
