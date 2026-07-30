import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgentDrawer } from "./components/agents/AgentDrawer";
import { AgentsPanel } from "./components/agents/AgentsPanel";
import { AnalyticsDrawer, loadBudgetConfig } from "./components/analytics/AnalyticsDrawer";
import { Banners } from "./components/shell/Banners";
import { Composer } from "./components/shell/Composer";
import { ConnectScreen } from "./components/shell/ConnectScreen";
import { HeaderBar } from "./components/shell/HeaderBar";
import { Toasts } from "./components/shell/Toasts";
import { Transcript } from "./components/transcript/Transcript";
import { CommandPalette, AIChatPanel, OffscreenCanvasBoard, FloatingToolbar, ToolType } from "./components/collaborative";
import { CanvasErrorBoundary } from "./components/layout/CanvasErrorBoundary";
import { parseCollabLink } from "./lib/link";
import { useSessionManager } from "./hooks/useSessionManager";
import { useCanvasSocket } from "./hooks/useCanvasSocket";
import { GuestClient } from "./lib/client";
import { useGuestSnapshot } from "./lib/use-guest";
import type { ToolRenderHost } from "./tool-render";
import "./components/shell/shell.css";

const NAME_KEY = "omp.collab.name";

interface Creds {
	link: string;
	name: string;
}

function storedName(): string {
	try {
		return localStorage.getItem(NAME_KEY) ?? "guest";
	} catch {
		return "guest";
	}
}

/** Deep link = everything after the FIRST `#` (legacy links carry a second `#` inside the fragment). */
function hashLink(): string | null {
	const href = window.location.href;
	const i = href.indexOf("#");
	if (i < 0 || i + 1 >= href.length) return null;
	return href.slice(i + 1);
}

export function App(): ReactNode {
	const [client, setClient] = useState<GuestClient | null>(null);
	const [connectError, setConnectError] = useState<string | null>(null);
	const credsRef = useRef<Creds | null>(null);
	const clientRef = useRef<GuestClient | null>(null);

	const disconnectCurrentClient = useCallback(() => {
		if (clientRef.current) {
			const active = clientRef.current;
			clientRef.current = null;
			active.close();
		}
	}, []);

	const { activeHash, sessions, addSession, switchSession } = useSessionManager();
	const { isOnline, connectionError, emitStroke } = useCanvasSocket(activeHash);

	const activeSessionName = useMemo(() => {
		const currentSession = sessions.find(
			s => s.hash === activeHash || s.hash === `#${activeHash}` || s.hash.replace(/^#/, "") === activeHash.replace(/^#/, "")
		);
		if (currentSession) {
			return currentSession.name;
		}
		if (activeHash) {
			return "Shared Session";
		}
		return "Main Canvas";
	}, [activeHash, sessions]);

	// Auto-prompt/save session if a user lands on a raw hash URL not in local storage
	useEffect(() => {
		const hash = window.location.hash;
		if (hash && hash.length > 3) {
			const exists = sessions.some(s => s.hash === hash);
			if (!exists) {
				const trimmed = hash.replace(/^#/, "");
				const parseRes = parseCollabLink(trimmed);
				let derivedName = "Shared Session";
				if (!("error" in parseRes)) {
					try {
						derivedName = new URL(parseRes.wsUrl).hostname;
					} catch {
						derivedName = parseRes.roomId || "Shared Session";
					}
				}
				addSession(derivedName, hash);
			}
		}
	}, [sessions, addSession]);

	const connect = useCallback((link: string, name: string): void => {
		let next: GuestClient;
		try {
			next = new GuestClient(link, name);
		} catch (err) {
			setConnectError(err instanceof Error ? err.message : String(err));
			return;
		}
		disconnectCurrentClient();
		clientRef.current = next;
		next.connect();
		try {
			localStorage.setItem(NAME_KEY, name);
		} catch {
			// storage unavailable (private mode) — non-fatal
		}
		credsRef.current = { link, name };
		const formatted = link.startsWith("#") ? link : `#${link}`;
		if (window.location.hash !== formatted) {
			window.location.hash = formatted;
		}
		switchSession(formatted);
		setConnectError(null);
		setClient(next);
	}, [disconnectCurrentClient, switchSession]);

	const leave = useCallback((): void => {
		disconnectCurrentClient();
		credsRef.current = null;
		if (window.location.hash) {
			window.location.hash = "";
		}
		switchSession("");
		setClient(null);
		history.replaceState(null, "", window.location.pathname + window.location.search);
	}, [disconnectCurrentClient, switchSession]);

	const rejoinTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
	const rejoin = useCallback((): void => {
		const creds = credsRef.current;
		if (creds) {
			disconnectCurrentClient();
			setClient(null);
			clearTimeout(rejoinTimeoutRef.current);
			rejoinTimeoutRef.current = setTimeout(() => {
				if (credsRef.current === creds) {
					connect(creds.link, creds.name);
				}
			}, 50);
		}
	}, [disconnectCurrentClient, connect]);

	// Visual Viewport: adjust app height to fit screen space when mobile keyboard opens.
	useEffect(() => {
		const vv = window.visualViewport;
		if (!vv) return;

		const updateHeight = () => {
			document.documentElement.style.setProperty("--viewport-height", `${vv.height}px`);
			window.scrollTo(0, 0);
		};

		updateHeight();
		vv.addEventListener("resize", updateHeight);
		vv.addEventListener("scroll", updateHeight);

		return () => {
			vv.removeEventListener("resize", updateHeight);
			vv.removeEventListener("scroll", updateHeight);
		};
	}, []);

	// Deep link & session hash change: auto-connect or reconnect when activeHash changes.
	useEffect(() => {
		const targetLink = activeHash.startsWith("#") ? activeHash.slice(1) : activeHash;
		if (targetLink && targetLink.length > 0) {
			const currentConnected = credsRef.current?.link;
			if (!client || currentConnected !== targetLink) {
				connect(targetLink, storedName());
			}
		}
	}, [activeHash, client, connect]);

	useEffect(() => {
		if (!client) document.title = "omp collab";
	}, [client]);

	if (!client) {
		return <ConnectScreen defaultName={storedName()} error={connectError} onConnect={connect} />;
	}
	return (
		<Session
			key={activeHash}
			client={client}
			activeHash={activeHash}
			activeSessionName={activeSessionName}
			isOnline={isOnline}
			connectionError={connectionError}
			emitStroke={emitStroke}
			onLeave={leave}
			onRejoin={rejoin}
		/>
	);
}

interface SessionProps {
	client: GuestClient;
	activeHash: string;
	activeSessionName: string;
	isOnline: boolean;
	connectionError: string | null;
	emitStroke: (stroke: any) => void;
	onLeave(): void;
	onRejoin(): void;
}

function Session({ client, activeHash, activeSessionName, isOnline, connectionError, emitStroke, onLeave, onRejoin }: SessionProps): ReactNode {
	const snap = useGuestSnapshot(client);
	const [railOpen, setRailOpen] = useState(false);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [analyticsOpen, setAnalyticsOpen] = useState(false);
	const [aiChatOpen, setAiChatOpen] = useState(false);
	const [activeTool, setActiveTool] = useState<ToolType>("select");
	const [canvasOverlayActive, setCanvasOverlayActive] = useState(false);
	const autoOpenedRef = useRef(false);

	const subCount = useMemo(() => snap.agents.filter(a => a.kind === "sub").length, [snap.agents]);

	// Task-card agent chips drill into the same drawer the rail uses.
	const agentIds = useMemo(() => new Set(snap.agents.map(a => a.id)), [snap.agents]);
	const toolHost = useMemo<ToolRenderHost>(
		() => ({
			hasAgent: id => agentIds.has(id),
			openAgent: id => {
				if (agentIds.has(id)) setSelectedId(id);
			},
		}),
		[agentIds],
	);

	// Auto-open the rail the first time a subagent appears.
	useEffect(() => {
		if (subCount > 0 && !autoOpenedRef.current) {
			autoOpenedRef.current = true;
			setRailOpen(true);
		}
	}, [subCount]);

	const title = snap.header?.title ?? snap.state?.sessionName ?? activeSessionName ?? "session";
	useEffect(() => {
		document.title = `${title} · omp collab`;
	}, [title]);

	const drawerAgent = selectedId != null ? snap.agents.find(a => a.id === selectedId) : undefined;

	// Budget Limit Calculation
	const budget = useMemo(() => loadBudgetConfig(), [analyticsOpen]);
	const totalTokens = useMemo(() => {
		let tok = 0;
		if (snap.state?.contextUsage?.tokens) return snap.state.contextUsage.tokens;
		for (const e of snap.entries) {
			if (e.type === "message" && e.message.role === "assistant") {
				const usage = e.message.usage;
				if (usage) tok += usage.totalTokens ?? 0;
			}
		}
		return tok;
	}, [snap.entries, snap.state?.contextUsage]);

	const tokenPct = budget.enabled && budget.tokenLimit > 0 ? (totalTokens / budget.tokenLimit) * 100 : 0;
	const showBudgetBanner = budget.enabled && tokenPct >= 80;

	return (
		<div className="sh-app relative">
			{/* Global Keyboard Command Palette */}
			<CommandPalette
				onToolChange={(tool) => {
					setActiveTool(tool);
					setCanvasOverlayActive(true);
				}}
				onToggleAIChat={() => setAiChatOpen(prev => !prev)}
			/>

			{/* 3. Offscreen Canvas Board with key={activeHash} to destroy & re-instantiate worker on workspace switch */}
			{canvasOverlayActive && activeHash && (
				<div className="fixed inset-0 z-10 pointer-events-auto">
					<CanvasErrorBoundary onReset={() => setCanvasOverlayActive(false)}>
						<OffscreenCanvasBoard
							key={`canvas-${activeHash}`}
							onStrokeComplete={emitStroke}
						/>
					</CanvasErrorBoundary>
					<FloatingToolbar
						activeTool={activeTool}
						onToolChange={setActiveTool}
						isOnline={isOnline}
						connectedUsersCount={1}
						connectionError={connectionError}
					/>
				</div>
			)}

			<HeaderBar
				snapshot={snap}
				subCount={subCount}
				railOpen={railOpen}
				onToggleRail={() => setRailOpen(open => !open)}
				onLeave={onLeave}
				onOpenAnalytics={() => setAnalyticsOpen(true)}
			/>
			{showBudgetBanner && (
				<div
					className={`sh-budget-banner ${tokenPct >= 100 ? "sh-budget-banner-danger" : "sh-budget-banner-warning"}`}
				>
					<AlertTriangle size={14} />
					<span>
						<strong>{tokenPct >= 100 ? "Budget Exceeded!" : "Budget Warning (80%+)"}</strong> —{" "}
						{totalTokens.toLocaleString()} / {budget.tokenLimit.toLocaleString()} tokens used (
						{tokenPct.toFixed(0)}%)
					</span>
					<button type="button" className="sh-budget-banner-btn" onClick={() => setAnalyticsOpen(true)}>
						Adjust Budget
					</button>
				</div>
			)}
			<main className="sh-main">
				<section className="sh-content" data-rail={railOpen ? "true" : "false"}>
					<div className="sh-transcript">
						<Transcript
							entries={snap.entries}
							stream={snap.stream}
							streamDone={snap.streamDone}
							activeTools={snap.activeTools}
							working={snap.working}
							host={toolHost}
						/>
					</div>
				</section>
				{railOpen && (
					<>
						<div className="sh-rail-backdrop" onClick={() => setRailOpen(false)} />
						<aside className="sh-rail">
							<AgentsPanel
								agents={snap.agents}
								progress={snap.progress}
								lifecycle={snap.lifecycle}
								selectedId={selectedId}
								onSelect={setSelectedId}
							/>
						</aside>
					</>
				)}
			</main>
			<Composer client={client} snapshot={snap} />
			{drawerAgent && (
				<>
					<div className="ag-drawer-backdrop" onClick={() => setSelectedId(null)} />
					<AgentDrawer
						agent={drawerAgent}
						progress={snap.progress.get(drawerAgent.id)}
						client={client}
						readOnly={snap.readOnly}
						host={toolHost}
						onClose={() => setSelectedId(null)}
					/>
				</>
			)}
			{analyticsOpen && <AnalyticsDrawer snapshot={snap} onClose={() => setAnalyticsOpen(false)} />}
			<AIChatPanel endpoint="/api/chat" isOpen={aiChatOpen} onClose={() => setAiChatOpen(false)} />
			<Banners phase={snap.phase} endedReason={snap.endedReason} onRejoin={onRejoin} onNewLink={onLeave} />
			<Toasts notices={snap.notices} />
		</div>
	);
}

