import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";

export interface PortalModalProps {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
	children: React.ReactNode;
	className?: string;
}

export function PortalModal({
	isOpen,
	onClose,
	title,
	children,
	className = "",
}: PortalModalProps): React.ReactNode {
	const [mounted, setMounted] = useState(false);
	const modalRef = useRef<HTMLDivElement>(null);

	// Ensure DOM is ready for SSR/hydration safety
	useEffect(() => {
		setMounted(true);
	}, []);

	// Lock background body scroll when active
	useEffect(() => {
		if (isOpen) {
			const originalOverflow = document.body.style.overflow;
			document.body.style.overflow = "hidden";
			return () => {
				document.body.style.overflow = originalOverflow;
			};
		}
	}, [isOpen]);

	// Listen for Escape key to close modal
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onClose();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	// Trap focus inside modal
	useEffect(() => {
		if (!isOpen || !modalRef.current) return;

		const modalElement = modalRef.current;
		const focusableElements = modalElement.querySelectorAll<HTMLElement>(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		);

		if (focusableElements.length > 0) {
			focusableElements[0].focus();
		}

		const handleTabKey = (e: KeyboardEvent) => {
			if (e.key !== "Tab" || focusableElements.length === 0) return;

			const firstElement = focusableElements[0];
			const lastElement = focusableElements[focusableElements.length - 1];

			if (e.shiftKey) {
				if (document.activeElement === firstElement) {
					e.preventDefault();
					lastElement.focus();
				}
			} else {
				if (document.activeElement === lastElement) {
					e.preventDefault();
					firstElement.focus();
				}
			}
		};

		window.addEventListener("keydown", handleTabKey);
		return () => window.removeEventListener("keydown", handleTabKey);
	}, [isOpen]);

	if (!isOpen || !mounted) return null;

	return ReactDOM.createPortal(
		<div
			className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
			role="dialog"
			aria-modal="true"
			aria-label={title || "Modal Dialog"}
		>
			{/* Backdrop Overlay Click Handler */}
			<div
				className="absolute inset-0"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Modal Card Container */}
			<div
				ref={modalRef}
				className={`relative z-10 w-full max-w-md bg-[var(--bg-raised)] border border-[var(--border-strong)] rounded-xl shadow-2xl overflow-hidden ${className}`}
			>
				{title && (
					<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-inset)]">
						<h3 className="text-sm font-semibold text-[var(--fg)]">{title}</h3>
						<button
							type="button"
							onClick={onClose}
							className="p-1 text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-overlay)] rounded-md transition-colors"
							aria-label="Close dialog"
						>
							<X size={16} />
						</button>
					</div>
				)}

				<div className="p-4">{children}</div>
			</div>
		</div>,
		document.getElementById("portal-root") || document.body
	);
}
