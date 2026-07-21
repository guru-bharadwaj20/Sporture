import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "./ToastProvider";
import { useToast } from "./toastContext";

const Trigger = () => {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.success("Saved")}>success</button>
      <button onClick={() => toast.error("Broke")}>error</button>
      <button onClick={() => toast.info("Heads up")}>info</button>
      <button onClick={() => toast.error("line one\nline two")}>multiline</button>
    </>
  );
};

const renderWithProvider = () =>
  render(
    <ToastProvider>
      <Trigger />
    </ToastProvider>
  );

afterEach(() => {
  vi.useRealTimers();
});

describe("ToastProvider", () => {
  it("renders children", () => {
    renderWithProvider();
    expect(screen.getByRole("button", { name: "success" })).toBeInTheDocument();
  });

  it("shows a toast when one is pushed", async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole("button", { name: "success" }));
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("stacks multiple toasts rather than replacing", async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole("button", { name: "success" }));
    await user.click(screen.getByRole("button", { name: "error" }));
    await user.click(screen.getByRole("button", { name: "info" }));

    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByText("Broke")).toBeInTheDocument();
    expect(screen.getByText("Heads up")).toBeInTheDocument();
  });

  it("announces politely without stealing focus", async () => {
    const user = userEvent.setup();
    renderWithProvider();
    await user.click(screen.getByRole("button", { name: "success" }));

    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "success" }));
  });

  it("can be dismissed by the user", async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole("button", { name: "success" }));
    await user.click(screen.getByRole("button", { name: /dismiss notification/i }));

    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });

  it("auto-dismisses a success toast", () => {
    vi.useFakeTimers();
    renderWithProvider();

    fireEvent.click(screen.getByRole("button", { name: "success" }));
    expect(screen.getByText("Saved")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });

  it("keeps errors on screen longer than successes", () => {
    vi.useFakeTimers();
    renderWithProvider();

    fireEvent.click(screen.getByRole("button", { name: "success" }));
    fireEvent.click(screen.getByRole("button", { name: "error" }));

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    expect(screen.getByText("Broke")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(screen.queryByText("Broke")).not.toBeInTheDocument();
  });

  it("preserves line breaks in multi-line validation messages", async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole("button", { name: "multiline" }));
    const message = screen.getByText(/line one/);

    expect(message.textContent).toContain("line one");
    expect(message.textContent).toContain("line two");
    expect(message.textContent).toBe(`line one\nline two`);
  });

  it("marks each kind distinctly for styling", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProvider();

    await user.click(screen.getByRole("button", { name: "error" }));
    expect(container.querySelector(".toast--error")).toBeInTheDocument();
  });
});

describe("useToast", () => {
  it("throws outside a provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger />)).toThrow(/must be used within a ToastProvider/i);
    vi.restoreAllMocks();
  });
});
