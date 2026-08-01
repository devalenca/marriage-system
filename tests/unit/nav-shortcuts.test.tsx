import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Keyboard shortcuts mounted once by the app shell: digits jump between
// sections, Ctrl/⌘+B folds the sidebar.

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: pushMock }),
}));

import { useNavShortcuts } from "@/components/use-nav-shortcuts";

function Harness({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
	useNavShortcuts({ onToggleSidebar });
	return (
		<div>
			<input aria-label="campo" />
			{/* Stands in for a rich-text surface; the role is what a real editor
			    would expose, and the guard reads the contenteditable attribute. */}
			{/* biome-ignore lint/a11y/useSemanticElements: a textarea cannot be contenteditable */}
			<div aria-label="editor" contentEditable role="textbox" tabIndex={0} />
		</div>
	);
}

describe("useNavShortcuts", () => {
	const toggle = vi.fn();

	beforeEach(() => {
		pushMock.mockReset();
		toggle.mockReset();
	});

	it("folds the sidebar on Ctrl+B", () => {
		render(<Harness onToggleSidebar={toggle} />);
		fireEvent.keyDown(window, { key: "b", ctrlKey: true });
		expect(toggle).toHaveBeenCalledTimes(1);
	});

	it("folds the sidebar on ⌘+B (macOS)", () => {
		render(<Harness onToggleSidebar={toggle} />);
		fireEvent.keyDown(window, { key: "b", metaKey: true });
		expect(toggle).toHaveBeenCalledTimes(1);
	});

	it("accepts an uppercase B (caps lock or shift)", () => {
		render(<Harness onToggleSidebar={toggle} />);
		fireEvent.keyDown(window, { key: "B", ctrlKey: true });
		expect(toggle).toHaveBeenCalledTimes(1);
	});

	it("ignores a bare B, so typing is never hijacked", () => {
		render(<Harness onToggleSidebar={toggle} />);
		fireEvent.keyDown(window, { key: "b" });
		expect(toggle).not.toHaveBeenCalled();
	});

	it("still works while typing in a plain field", () => {
		render(<Harness onToggleSidebar={toggle} />);
		fireEvent.keyDown(screen.getByLabelText("campo"), {
			key: "b",
			ctrlKey: true,
		});
		expect(toggle).toHaveBeenCalledTimes(1);
	});

	it("leaves Ctrl+B alone in rich-text editors, where it means bold", () => {
		render(<Harness onToggleSidebar={toggle} />);
		fireEvent.keyDown(screen.getByLabelText("editor"), {
			key: "b",
			ctrlKey: true,
		});
		expect(toggle).not.toHaveBeenCalled();
	});

	it("keeps the digit shortcuts working", () => {
		render(<Harness onToggleSidebar={toggle} />);
		fireEvent.keyDown(window, { key: "2" });
		expect(pushMock).toHaveBeenCalledWith("/checklist");
	});

	it("does not navigate when a digit is pressed with Ctrl", () => {
		render(<Harness onToggleSidebar={toggle} />);
		fireEvent.keyDown(window, { key: "2", ctrlKey: true });
		expect(pushMock).not.toHaveBeenCalled();
	});
});
