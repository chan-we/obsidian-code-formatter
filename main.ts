import { Plugin, Notice } from "obsidian";
import { format } from "prettier";
import * as babelPlugin from "prettier/plugins/babel";
import * as prettierPluginEstree from "prettier/plugins/estree";
import * as typescriptPlugin from "prettier/plugins/typescript";
import * as htmlPlugin from "prettier/plugins/html";
import * as postcssPlugin from "prettier/plugins/postcss";
import * as yamlPlugin from "prettier/plugins/yaml";

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

const plugins = [
	babelPlugin,
	typescriptPlugin,
	prettierPluginEstree,
	htmlPlugin,
	postcssPlugin,
	yamlPlugin
];

const langMap = {
	js: "typescript",
	javascript: "typescript",
	ts: "typescript",
	typescript: "typescript",
	json: "json",
	html: "html",
	css: "css",
	scss: "scss",
	// sass: "scss", // due to unknown error, `sass` is not supported at this version.
	less: "less",
	// markdown: "markdown",
	// md: "markdown",
	yaml: "yaml",
	yml: "yaml",
	jsx: "typescript",
	tsx: "typescript",
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
		return Promise.reject(new Error(`Language "${lang}" is not supported`));
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
							const p = new Promise((resolve, reject) => {
								const index = {
									start: start + 1,
									end: i,
								};

								formatCode(temp, lang)
									.then((res) => {
										resolve({ ...index, code: res });
									})
									.catch((e) => {
										reject(e);
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
				Promise.allSettled(promises).then(
					(
						res: PromiseSettledResult<{
							code: string;
							start: number;
							end: number;
						}>[],
					) => {
						let fulfilledCount = 0;
						let rejectedCount = 0;

						res.forEach((item) => {
							if (item.status === "fulfilled") {
								const { code, start, end } = item.value;
								doc.replaceRange(
									code,
									{ line: start + offset, ch: 0 },
									{ line: end + offset, ch: 0 },
								);

								offset +=
									code.split("\n").length - 1 - (end - start);
								fulfilledCount += 1;
							} else {
								console.error(item.reason);
								rejectedCount += 1;
							}
						});

						new Notice(
							`Formatting succeeded in ${fulfilledCount} place(s) and failed in ${rejectedCount} place(s).`,
						);
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
