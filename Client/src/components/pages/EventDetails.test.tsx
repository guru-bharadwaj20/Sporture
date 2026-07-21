import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import EventDetails from "./EventDetails";
import * as api from "../utils/api";
import { renderPage } from "../../test/renderPage";
import { makeEvent, makeFullEvent, makeUser, makeUserRef } from "../../test/factories";
import type { EventDTO } from "@shared/api";

vi.mock("../utils/api");

vi.mock("../common/EventMap", () => ({
  default: ({ events }: { events: EventDTO[] }) => (
    <div data-testid="event-map">{events.length} pins</div>
  ),
}));

const mockEvent = (event: EventDTO) =>
  vi.mocked(api.getEventById).mockResolvedValue({ data: event } as Awaited<
    ReturnType<typeof api.getEventById>
  >);

const renderDetails = (id = "evt-1") =>
  renderPage(<EventDetails />, {
    route: `/events/${id}`,
    path: "/events/:id",
    user: makeUser(),
  });

describe("EventDetails", () => {
  beforeEach(() => {
    vi.mocked(api.getEventById).mockReset();
  });

  it("fetches the event named in the URL", async () => {
    mockEvent(makeEvent());
    renderDetails("abc123");

    expect(await screen.findByText("Sunday Morning Football")).toBeInTheDocument();
    expect(api.getEventById).toHaveBeenCalledWith("abc123");
  });

  it("shows a loading state first", () => {
    vi.mocked(api.getEventById).mockReturnValue(new Promise(() => {}) as never);
    renderDetails();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows the sport, host and venue", async () => {
    mockEvent(
      makeEvent({
        sport: "Cricket",
        createdBy: makeUserRef({ name: "Meera Iyer" }),
      })
    );
    renderDetails();

    await screen.findByText("Sunday Morning Football");
    expect(screen.getAllByText(/Cricket/).length).toBeGreaterThan(0);
    expect(screen.getByText("Meera Iyer")).toBeInTheDocument();
    expect(screen.getAllByText(/Community Ground, Bengaluru/).length).toBeGreaterThan(0);
  });

  it("renders the venue on a map", async () => {
    mockEvent(makeEvent());
    renderDetails();
    expect(await screen.findByTestId("event-map")).toHaveTextContent("1 pins");
  });

  it("lists the players who have joined", async () => {
    mockEvent(
      makeEvent({
        currentPlayers: [
          makeUserRef({ name: "Radha Raman" }),
          makeUserRef({ name: "Arjun Patel" }),
        ],
      })
    );
    renderDetails();

    expect(await screen.findByText("Radha Raman")).toBeInTheDocument();
    expect(screen.getByText("Arjun Patel")).toBeInTheDocument();
  });

  it("shows how many places are left", async () => {
    mockEvent(
      makeEvent({ maxPlayers: 10, currentPlayers: [makeUserRef(), makeUserRef()] })
    );
    renderDetails();
    expect(await screen.findByText(/8 spots left/i)).toBeInTheDocument();
  });

  it("says so when the event is full", async () => {
    mockEvent(makeFullEvent({ maxPlayers: 4 }));
    renderDetails();
    expect(await screen.findByText(/full/i)).toBeInTheDocument();
  });

  it("does not leak player email addresses", async () => {
    mockEvent(makeEvent());
    const { container } = renderDetails();

    await screen.findByText("Sunday Morning Football");
    expect(container.textContent).not.toContain("@");
  });

  it("offers a route back to the listing", async () => {
    mockEvent(makeEvent());
    renderDetails();

    await screen.findByText("Sunday Morning Football");
    expect(screen.getByRole("button", { name: /back to events/i })).toBeInTheDocument();
  });

  it("handles a missing event without crashing", async () => {
    vi.mocked(api.getEventById).mockRejectedValue(new Error("Event not found"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderDetails();

    expect(await screen.findByText(/not found|unavailable|error/i)).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
