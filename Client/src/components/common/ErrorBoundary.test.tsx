import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import ErrorBoundary from "./ErrorBoundary";

/** Throws on first render, then recovers — used to test the retry path. */
const Bomb = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) throw new Error("kaboom from render");
  return <p>Recovered content</p>;
};

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // React logs caught render errors to console.error; silence it so the
    // test output isn't misleading noise.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>
    );
    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("shows a fallback instead of a blank page when a child throws", () => {
    // The whole point: without this, React unmounts the tree and the user
    // sees an empty document with no explanation.
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(document.body.textContent?.trim().length).toBeGreaterThan(0);
  });

  it("offers a route back to the events list", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByRole("link", { name: /browse events/i })).toHaveAttribute(
      "href",
      "/events"
    );
  });

  it("logs the error so it stays diagnosable", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(console.error).toHaveBeenCalled();
  });

  it("renders a custom fallback when given one", () => {
    render(
      <ErrorBoundary fallback={<p>Custom fallback</p>}>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });

  it("recovers when the retry button is pressed and the cause is gone", async () => {
    const user = userEvent.setup();

    const Harness = () => {
      const [broken, setBroken] = useState(true);
      return (
        <>
          <button onClick={() => setBroken(false)}>Fix it</button>
          <ErrorBoundary>
            <Bomb shouldThrow={broken} />
          </ErrorBoundary>
        </>
      );
    };

    render(<Harness />);
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Remove the cause, then clear the boundary's captured error.
    await user.click(screen.getByRole("button", { name: /fix it/i }));
    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(screen.getByText("Recovered content")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("isolates the failure to its own subtree", () => {
    render(
      <div>
        <p>Sibling still here</p>
        <ErrorBoundary>
          <Bomb shouldThrow />
        </ErrorBoundary>
      </div>
    );

    expect(screen.getByText("Sibling still here")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
