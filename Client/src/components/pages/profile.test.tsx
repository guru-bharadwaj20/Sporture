import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Profile from "./profile";
import * as api from "../utils/api";
import { renderPage } from "../../test/renderPage";
import { makeEvent, makeUser, inDays } from "../../test/factories";
import { getStoredUser } from "../utils/storage";
import type { EventDTO, UserDTO } from "@shared/api";

vi.mock("../utils/api");

const setup = (user: UserDTO, events: EventDTO[] = []) => {
  vi.mocked(api.getCurrentUser).mockResolvedValue({
    data: { success: true, user },
  } as Awaited<ReturnType<typeof api.getCurrentUser>>);
  vi.mocked(api.getJoinedEvents).mockResolvedValue({ data: events } as Awaited<
    ReturnType<typeof api.getJoinedEvents>
  >);
};

const renderProfile = (user: UserDTO) =>
  renderPage(<Profile />, { route: "/profile", path: "/profile", user });

describe("Profile", () => {
  beforeEach(() => {
    vi.mocked(api.getCurrentUser).mockReset();
    vi.mocked(api.getJoinedEvents).mockReset();
    vi.mocked(api.updateUserById).mockReset();
    Object.defineProperty(navigator, "geolocation", {
      value: { getCurrentPosition: vi.fn() },
      configurable: true,
    });
  });

  it("shows the signed-in user's details", async () => {
    const me = makeUser({ name: "Radha Raman", bio: "Loves badminton." });
    setup(me);
    renderProfile(me);

    expect(await screen.findByText("Radha Raman")).toBeInTheDocument();
    expect(screen.getByText("Loves badminton.")).toBeInTheDocument();
  });

  it("shows the user's own stats", async () => {
    const me = makeUser({ gamesPlayed: 12, eventsHosted: 3 });
    setup(me);
    renderProfile(me);

    await screen.findByText(me.name);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("lists favourite sports", async () => {
    const me = makeUser({ favSports: ["Badminton", "Football"] });
    setup(me);
    renderProfile(me);

    await screen.findByText(me.name);
    expect(screen.getByText(/Badminton/)).toBeInTheDocument();
    expect(screen.getByText(/Football/)).toBeInTheDocument();
  });

  it("splits joined events into upcoming and past", async () => {
    const me = makeUser();
    setup(me, [
      makeEvent({ title: "Coming up", date: inDays(4) }),
      makeEvent({ title: "Already played", date: inDays(-4) }),
    ]);
    renderProfile(me);

    expect(await screen.findByText(/Coming up/)).toBeInTheDocument();
    expect(screen.queryByText(/Already played/)).not.toBeInTheDocument();
  });

  it("shows past events when that tab is chosen", async () => {
    const me = makeUser();
    const user = userEvent.setup();
    setup(me, [makeEvent({ title: "Already played", date: inDays(-4) })]);
    renderProfile(me);

    await screen.findByText(me.name);
    await user.click(screen.getByRole("button", { name: /past/i }));

    expect(await screen.findByText(/Already played/)).toBeInTheDocument();
  });

  describe("editing", () => {
    it("saves only the fields a user may change", async () => {
      const me = makeUser();
      const user = userEvent.setup();
      setup(me);
      vi.mocked(api.updateUserById).mockResolvedValue({
        data: { ...me, name: "Radha R." },
      } as Awaited<ReturnType<typeof api.updateUserById>>);

      renderProfile(me);
      await screen.findByText(me.name);
      await user.click(screen.getByRole("button", { name: /edit profile/i }));

      const nameField = screen.getByDisplayValue(me.name);
      await user.clear(nameField);
      await user.type(nameField, "Radha R.");
      await user.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => expect(api.updateUserById).toHaveBeenCalled());
      const [, payload] = vi.mocked(api.updateUserById).mock.calls[0]!;
      expect(Object.keys(payload).sort()).toEqual([
        "bio",
        "city",
        "favSports",
        "name",
        "skillLevel",
      ]);
    });

    it("refreshes the cached session after saving", async () => {
      const me = makeUser();
      const user = userEvent.setup();
      setup(me);
      vi.mocked(api.updateUserById).mockResolvedValue({
        data: { ...me, name: "Radha R." },
      } as Awaited<ReturnType<typeof api.updateUserById>>);

      renderProfile(me);
      await screen.findByText(me.name);
      await user.click(screen.getByRole("button", { name: /edit profile/i }));
      await user.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => expect(getStoredUser()?.name).toBe("Radha R."));
    });

    it("confirms the save", async () => {
      const me = makeUser();
      const user = userEvent.setup();
      setup(me);
      vi.mocked(api.updateUserById).mockResolvedValue({ data: me } as Awaited<
        ReturnType<typeof api.updateUserById>
      >);

      renderProfile(me);
      await screen.findByText(me.name);
      await user.click(screen.getByRole("button", { name: /edit profile/i }));
      await user.click(screen.getByRole("button", { name: /save/i }));

      expect(await screen.findByText(/profile updated/i)).toBeInTheDocument();
    });

    it("reports a rejected save", async () => {
      const me = makeUser();
      const user = userEvent.setup();
      setup(me);
      vi.mocked(api.updateUserById).mockRejectedValue(new Error("Validation failed"));
      vi.spyOn(console, "error").mockImplementation(() => {});

      renderProfile(me);
      await screen.findByText(me.name);
      await user.click(screen.getByRole("button", { name: /edit profile/i }));
      await user.click(screen.getByRole("button", { name: /save/i }));

      expect(await screen.findByText(/validation failed/i)).toBeInTheDocument();
      vi.restoreAllMocks();
    });
  });

  it("survives a failed load without a blank screen", async () => {
    vi.mocked(api.getCurrentUser).mockRejectedValue(new Error("offline"));
    vi.mocked(api.getJoinedEvents).mockRejectedValue(new Error("offline"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    renderProfile(makeUser());

    expect(await screen.findByText(/user not found/i)).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
