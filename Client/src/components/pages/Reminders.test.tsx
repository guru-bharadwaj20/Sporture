import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import Reminders from "./Reminders";
import * as api from "../utils/api";
import { renderPage } from "../../test/renderPage";
import { makeEvent, makeUser, inDays } from "../../test/factories";
import type { EventDTO } from "@shared/api";

vi.mock("../utils/api");

const mockJoined = (events: EventDTO[]) =>
  vi.mocked(api.getJoinedEvents).mockResolvedValue({ data: events } as Awaited<
    ReturnType<typeof api.getJoinedEvents>
  >);

const renderReminders = () =>
  renderPage(<Reminders />, { route: "/reminders", path: "/reminders", user: makeUser() });

describe("Reminders", () => {
  beforeEach(() => {
    vi.mocked(api.getJoinedEvents).mockReset();
  });

  it("lists the events you are going to", async () => {
    mockJoined([
      makeEvent({ title: "Sunday Football", date: inDays(2) }),
      makeEvent({ title: "Evening Badminton", date: inDays(5) }),
    ]);
    renderReminders();

    expect(await screen.findByText("Sunday Football")).toBeInTheDocument();
    expect(screen.getByText("Evening Badminton")).toBeInTheDocument();
  });

  it("hides events that have already happened", async () => {
    // A reminder for a past event is noise.
    mockJoined([
      makeEvent({ title: "Already played", date: inDays(-3) }),
      makeEvent({ title: "Coming up", date: inDays(3) }),
    ]);
    renderReminders();

    expect(await screen.findByText("Coming up")).toBeInTheDocument();
    expect(screen.queryByText("Already played")).not.toBeInTheDocument();
  });

  it("puts the soonest event first", async () => {
    mockJoined([
      makeEvent({ title: "Later", date: inDays(9) }),
      makeEvent({ title: "Sooner", date: inDays(1) }),
      makeEvent({ title: "Middle", date: inDays(4) }),
    ]);
    const { container } = renderReminders();

    await screen.findByText("Sooner");
    const titles = Array.from(container.querySelectorAll(".event-name, h3")).map(
      (n) => n.textContent
    );
    expect(titles.indexOf("Sooner")).toBeLessThan(titles.indexOf("Middle"));
    expect(titles.indexOf("Middle")).toBeLessThan(titles.indexOf("Later"));
  });

  it("counts down in days for a distant event", async () => {
    mockJoined([makeEvent({ date: inDays(3) })]);
    renderReminders();
    expect(await screen.findByText(/in 3 days/i)).toBeInTheDocument();
  });

  it("counts down in hours for one later today", async () => {
    const inFiveHours = new Date(Date.now() + 5 * 3600_000).toISOString();
    mockJoined([makeEvent({ date: inFiveHours })]);
    renderReminders();
    expect(await screen.findByText(/in 5 hours/i)).toBeInTheDocument();
  });

  it("uses the singular for one day", async () => {
    // "in 1 days" is the kind of detail that reads as unfinished.
    const inOneDay = new Date(Date.now() + 25 * 3600_000).toISOString();
    mockJoined([makeEvent({ date: inOneDay })]);
    renderReminders();
    expect(await screen.findByText(/in 1 day(?!s)/i)).toBeInTheDocument();
  });

  it("shows the venue address, not the location object", async () => {
    mockJoined([makeEvent()]);
    renderReminders();
    expect(await screen.findByText(/Community Ground, Bengaluru/)).toBeInTheDocument();
  });

  it("shows an empty state when nothing is booked", async () => {
    mockJoined([]);
    renderReminders();
    expect(await screen.findByText(/no upcoming events/i)).toBeInTheDocument();
  });

  it("reports a load failure", async () => {
    vi.mocked(api.getJoinedEvents).mockRejectedValue(new Error("offline"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    renderReminders();

    expect(await screen.findByText(/failed to load your events/i)).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
