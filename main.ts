import { Plugin } from "obsidian";
import { format } from "prettier";
import * as babelPlugin from "prettier/plugins/babel";
import * as prettierPluginEstree from "prettier/plugins/estree";
import * as typescriptPlugin from "prettier/plugins/typescript";
import * as htmlPlugin from "prettier/plugins/html";

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

const plugins = [babelPlugin, typescriptPlugin, prettierPluginEstree, htmlPlugin];

const langMap = {
	js: "typescript",
	javascript: "typescript",
	ts: "typescript",
	typescript: "typescript",
	// json: "json",
	html: "html",
	// css: "css",
	// scss: "scss",
	// less: "less",
	// markdown: "markdown",
	// md: "markdown",
	// yaml: "yaml",
	// yml: "yaml",
	// "graphql": "graphql",
	// vue: "vue",
	// "angular": "angular",
	// "json5": "json5",
	// "toml": "toml",
	// "lua": "lua",
	// "python": "python",
	// "ruby": "ruby",
	// "bash": "bash",
	// "sh": "bash",
	// "php": "php",
	// "java": "java",
	// "c": "c",
	// "cpp": "c++",
	// "c++": "c++",
	// "go": "go",
	// "haskell": "haskell",
	// "kotlin": "kotlin"
};

const langs = Object.keys(langMap);

const formatCode = (code: string, lang: string) => {
	console.log("formatCode", lang);
	if (!langs.includes(lang)) {
		return Promise.resolve(code);
	}

	return format(code, {
		semi: false,
		parser: langMap[lang as keyof typeof langMap],
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
				let lang = "";
				const promises = [];

				for (let i = 0; i < doc.lineCount(); i++) {
					const line = doc.getLine(i);
					const reg = /\s*```([a-zA-Z]*)/;

					if (reg.test(line)) {
						flag = !flag;
						if (flag) {
							start = i;
							lang = line.match(reg)?.[1] || "";
							continue;
						}

						if (!Number.isNaN(start)) {
							const p = new Promise((resolve) => {
								const index = {
									start: start + 1,
									end: i,
								};

								formatCode(temp, lang).then((res) => {
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
