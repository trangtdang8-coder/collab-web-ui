import { Marked } from "marked";
import { createHighlighter, type Highlighter } from "shiki";
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";

let highlighter: Highlighter | null = null;
let initPromise: Promise<void> | null = null;

const marked = new Marked({
	gfm: true,
	breaks: true,
});

const initShiki = async () => {
	try {
		highlighter = await createHighlighter({
			themes: ["dark-plus"],
			langs: ["javascript", "typescript", "bash", "python", "json", "html", "css"],
			engine: createJavaScriptRegexEngine(),
		});
		if (highlighter) {
			marked.use({
				renderer: {
					code({ text: codeText, lang }) {
						const validLang = lang && highlighter?.getLoadedLanguages().includes(lang as any) ? lang : "text";
						try {
							return highlighter?.codeToHtml(codeText, { lang: validLang, theme: "dark-plus" }) || `<pre><code>${codeText}</code></pre>`;
						} catch {
							return `<pre><code>${codeText}</code></pre>`;
						}
					},
				},
			});
		}
	} catch (err) {
		console.warn("markdown.worker: Shiki initialization error:", err);
	}
};

const getInitPromise = () => {
	if (!initPromise) {
		initPromise = initShiki();
	}
	return initPromise;
};

export interface MarkdownWorkerRequest {
	id: string;
	text: string;
}

export interface MarkdownWorkerResponse {
	id: string;
	html: string;
	error?: string;
}

self.onmessage = async (e: MessageEvent<MarkdownWorkerRequest>) => {
	const { id, text } = e.data;
	try {
		await getInitPromise();
		const rawHtml = marked.parse(text, { async: false }) as string;
		self.postMessage({ id, html: rawHtml } as MarkdownWorkerResponse);
	} catch (err) {
		self.postMessage({
			id,
			html: text,
			error: err instanceof Error ? err.message : String(err),
		} as MarkdownWorkerResponse);
	}
};
