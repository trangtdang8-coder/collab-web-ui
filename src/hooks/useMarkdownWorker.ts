import { useState, useEffect, useRef } from "react";
import DOMPurify from "dompurify";

const TIMEOUT_MS = 10_000;

export interface UseMarkdownWorkerResult {
	html: string;
	loading: boolean;
}

let idCounter = 0;

export const useMarkdownWorker = (text: string): UseMarkdownWorkerResult => {
	const [html, setHtml] = useState<string>("");
	const [loading, setLoading] = useState<boolean>(true);
	const workerRef = useRef<Worker | null>(null);
	const lastProcessedTextRef = useRef<string>("");

	useEffect(() => {
		workerRef.current = new Worker(new URL("../workers/markdown.worker.ts", import.meta.url), {
			type: "module",
		});

		workerRef.current.onerror = () => {
			setHtml(text);
			setLoading(false);
		};

		return () => {
			workerRef.current?.terminate();
			workerRef.current = null;
		};
	}, []);

	useEffect(() => {
		if (!workerRef.current) return;
		if (text === lastProcessedTextRef.current && html) {
			setLoading(false);
			return;
		}

		setLoading(true);
		const id = ++idCounter;

		const timeoutId = setTimeout(() => {
			workerRef.current?.removeEventListener("message", handleMessage);
			setHtml(text);
			setLoading(false);
		}, TIMEOUT_MS);

		const handleMessage = (e: MessageEvent) => {
			if (e.data && e.data.id === id) {
				clearTimeout(timeoutId);
				const safeHtml = DOMPurify.sanitize(e.data.html, {
					ADD_ATTR: ["target", "rel", "class"],
				});
				setHtml(safeHtml);
				setLoading(false);
			}
		};

		workerRef.current.addEventListener("message", handleMessage);
		workerRef.current.postMessage({ id, text });

		return () => {
			clearTimeout(timeoutId);
			workerRef.current?.removeEventListener("message", handleMessage);
		};
	}, [text]);

	return { html, loading };
};
