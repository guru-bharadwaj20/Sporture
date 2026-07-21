import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { RecommendedEventDTO } from "@shared/api";
import RecommendedEvents from "./RecommendedEvents";
import * as api from "../utils/api";

vi.mock("../utils/api");

const makeEvent = (over: Partial<RecommendedEventDTO> = {}): RecommendedEventDTO =>
  ({
    _id: "e1",
    title: "Sunday Morning Football",
    sport: "Football",
    date: new Date(Date.now() + 3 * 86400000).toISOString(),
    location: {
      address: "Community Ground, Bengaluru",
      geo: { type: "Point", coordinates: [77.59, 12.97] },
    },
    maxPlayers: 10,
    currentPlayers: [{ _id: "p1", name: "Host" }],
    createdBy: { _id: "p1", name: "Host" },
    createdAt: "",
    updatedAt: "",
    score: 0.742,
    breakdown: { sport: 1, proximity: 0.5, skill: 1, social: 0, urgency: 0.6 },
    reasons: ["Football is one of your favourite sports", "Just 2.1 km away"],
    ...over,
  }) as RecommendedEventDTO;

const mockResponse = (events: RecommendedEventDTO[]) =>
  vi.mocked(api.getRecommendedEvents).mockResolvedValue({
    data: { count: events.length, personalised: true, events },
  } as Awaited<ReturnType<typeof api.getRecommendedEvents>>);

const renderRecs = () =>
  render(
    <MemoryRouter>
      <RecommendedEvents />
    </MemoryRouter>
  );

describe("RecommendedEvents", () => {
  beforeEach(() => {
    vi.mocked(api.getRecommendedEvents).mockReset();
  });

  it("shows a loading state first", () => {
    vi.mocked(api.getRecommendedEvents).mockReturnValue(new Promise(() => {}) as never);
    renderRecs();
    expect(screen.getByText(/finding events/i)).toBeInTheDocument();
  });

  it("renders a card per recommendation", async () => {
    mockResponse([makeEvent(), makeEvent({ _id: "e2", title: "Evening Badminton" })]);
    renderRecs();

    expect(await screen.findByText("Sunday Morning Football")).toBeInTheDocument();
    expect(screen.getByText("Evening Badminton")).toBeInTheDocument();
  });

  it("shows the score as a percentage, not a raw float", async () => {
    mockResponse([makeEvent({ score: 0.742 })]);
    renderRecs();

    expect(await screen.findByText("74% match")).toBeInTheDocument();
    expect(screen.queryByText("0.742")).not.toBeInTheDocument();
  });

  it("explains why each event was recommended", async () => {
    mockResponse([makeEvent()]);
    renderRecs();

    expect(
      await screen.findByText("Football is one of your favourite sports")
    ).toBeInTheDocument();
    expect(screen.getByText("Just 2.1 km away")).toBeInTheDocument();
  });

  it("caps the reasons shown at three", async () => {
    mockResponse([makeEvent({ reasons: ["one", "two", "three", "four", "five"] })]);
    renderRecs();

    await screen.findByText("one");
    expect(screen.getByText("three")).toBeInTheDocument();
    expect(screen.queryByText("four")).not.toBeInTheDocument();
  });

  it("shows remaining spots", async () => {
    mockResponse([makeEvent({ maxPlayers: 10, currentPlayers: [{ _id: "p1", name: "H" }] })]);
    renderRecs();
    expect(await screen.findByText("9 spots left")).toBeInTheDocument();
  });

  it("uses the singular for a single remaining spot", async () => {
    const players = Array.from({ length: 9 }, (_, i) => ({ _id: `p${i}`, name: "P" }));
    mockResponse([makeEvent({ maxPlayers: 10, currentPlayers: players })]);
    renderRecs();
    expect(await screen.findByText("1 spot left")).toBeInTheDocument();
  });

  it("omits the distance badge when distance is unknown", async () => {
    mockResponse([makeEvent()]);
    const { container } = renderRecs();

    await screen.findByText("Sunday Morning Football");
    expect(container.querySelector(".rec-card__distance")).not.toBeInTheDocument();
  });

  it("shows a distance badge when the API returns one", async () => {
    mockResponse([makeEvent({ distanceMetres: 3519 })]);
    renderRecs();
    expect(await screen.findByText("3.5 km away")).toBeInTheDocument();
  });

  it("links each card to its event", async () => {
    mockResponse([makeEvent({ _id: "abc123" })]);
    renderRecs();

    const link = await screen.findByRole("link", { name: /sunday morning football/i });
    expect(link).toHaveAttribute("href", "/events/abc123");
  });

  it("shows an empty state rather than a blank section", async () => {
    mockResponse([]);
    renderRecs();

    expect(await screen.findByText(/nothing to suggest yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /browse all events/i })).toBeInTheDocument();
  });

  it("surfaces an API failure instead of failing silently", async () => {
    vi.mocked(api.getRecommendedEvents).mockRejectedValue(new Error("network down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderRecs();

    expect(await screen.findByText(/network down/i)).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("offers to use location for better matches, and refetches with coords", async () => {
    mockResponse([makeEvent()]);
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: vi.fn((success) =>
          success({ coords: { latitude: 12.9, longitude: 77.6 } } as GeolocationPosition)
        ),
      },
      configurable: true,
    });

    const user = userEvent.setup();
    renderRecs();

    const locateBtn = await screen.findByRole("button", { name: /use my location/i });
    await user.click(locateBtn);

    await waitFor(() =>
      expect(api.getRecommendedEvents).toHaveBeenLastCalledWith(
        expect.objectContaining({ coords: { lat: 12.9, lng: 77.6 } })
      )
    );
  });
});
