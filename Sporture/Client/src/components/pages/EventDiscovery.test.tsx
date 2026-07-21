import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EventDiscovery from "./EventDiscovery";
import * as api from "../utils/api";
import { renderPage, landmark, landmarkText } from "../../test/renderPage";
import { makeEvent, makeFullEvent, makeUser, makeUserRef } from "../../test/factories";
import { getToken, getStoredUser } from "../utils/storage";
import type { EventDTO } from "@shared/api";

vi.mock("../utils/api");

// The map is exercised in EventMap's own tests and needs a real DOM box to
// measure; stubbing it keeps this file about discovery behaviour.
vi.mock("../common/EventMap", () => ({
  default: ({ events }: { events: EventDTO[] }) => (
    <div data-testid="event-map">{events.length} pins</div>
  ),
}));

const mockEvents = (events: EventDTO[]) =>
  vi.mocked(api.getEvents).mockResolvedValue({ data: events } as Awaited<
    ReturnType<typeof api.getEvents>
  >);

const renderDiscovery = (opts = {}) =>
  renderPage(<EventDiscovery />, {
    route: "/events",
    path: "/events",
    extraRoutes: [{ path: "/login", element: landmark("login") }],
    ...opts,
  });

describe("EventDiscovery", () => {
  beforeEach(() => {
    vi.mocked(api.getEvents).mockReset();
    vi.mocked(api.joinEvent).mockReset();
  });

  describe("listing", () => {
    it("shows a loading state before results arrive", () => {
      vi.mocked(api.getEvents).mockReturnValue(new Promise(() => {}) as never);
      renderDiscovery();
      expect(screen.getByText(/loading events/i)).toBeInTheDocument();
    });

    it("renders a card per event", async () => {
      mockEvents([
        makeEvent({ title: "Sunday Football" }),
        makeEvent({ title: "Evening Badminton" }),
      ]);
      renderDiscovery();

      expect(await screen.findByText("Sunday Football")).toBeInTheDocument();
      expect(screen.getByText("Evening Badminton")).toBeInTheDocument();
    });

    it("shows the venue address, not the raw location object", async () => {
      // location is { address, geo }; rendering it directly throws in React.
      mockEvents([makeEvent()]);
      renderDiscovery();
      expect(await screen.findByText(/Community Ground, Bengaluru/)).toBeInTheDocument();
    });

    it("reports how many events matched", async () => {
      mockEvents([makeEvent(), makeEvent(), makeEvent()]);
      renderDiscovery();
      const count = await screen.findByText(/showing/i);
      expect(count).toHaveTextContent("3");
    });

    it("offers an empty state with a route to create one", async () => {
      mockEvents([]);
      renderDiscovery();

      expect(await screen.findByText(/no events found/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /create event/i })).toBeInTheDocument();
    });

    it("recovers from a failed fetch without crashing", async () => {
      vi.mocked(api.getEvents).mockRejectedValue(new Error("network down"));
      vi.spyOn(console, "error").mockImplementation(() => {});
      renderDiscovery();

      expect(await screen.findByText(/no events found/i)).toBeInTheDocument();
      vi.restoreAllMocks();
    });
  });

  describe("sport filter", () => {
    it("requests only the chosen sport", async () => {
      const user = userEvent.setup();
      mockEvents([makeEvent({ sport: "Cricket" }), makeEvent({ sport: "Tennis" })]);
      renderDiscovery();
      await screen.findByText(/showing/i);

      await user.selectOptions(screen.getByRole("combobox"), "Cricket");

      await waitFor(() =>
        expect(api.getEvents).toHaveBeenLastCalledWith(
          expect.objectContaining({ sport: "Cricket" })
        )
      );
    });

    it("sends no sport param for All Sports", async () => {
      mockEvents([makeEvent()]);
      renderDiscovery();
      await screen.findByText(/showing/i);

      expect(api.getEvents).toHaveBeenCalledWith(expect.not.objectContaining({ sport: expect.anything() }));
    });
  });

  describe("proximity search", () => {
    beforeEach(() => {
      Object.defineProperty(navigator, "geolocation", {
        value: {
          getCurrentPosition: vi.fn((success) =>
            success({ coords: { latitude: 12.9352, longitude: 77.6245 } } as GeolocationPosition)
          ),
        },
        configurable: true,
      });
    });

    it("does not send coordinates until the user asks", async () => {
      mockEvents([makeEvent()]);
      renderDiscovery();
      await screen.findByText(/showing/i);

      expect(api.getEvents).toHaveBeenCalledWith(
        expect.not.objectContaining({ lat: expect.anything() })
      );
    });

    it("refetches with coordinates and a radius once located", async () => {
      const user = userEvent.setup();
      mockEvents([makeEvent()]);
      renderDiscovery();
      await screen.findByText(/showing/i);

      await user.click(screen.getByRole("button", { name: /find events near me/i }));

      await waitFor(() =>
        expect(api.getEvents).toHaveBeenLastCalledWith(
          expect.objectContaining({ lat: 12.9352, lng: 77.6245, radius: 10000 })
        )
      );
    });

    it("refetches when the radius changes", async () => {
      const user = userEvent.setup();
      mockEvents([makeEvent()]);
      renderDiscovery();
      await screen.findByText(/showing/i);

      await user.click(screen.getByRole("button", { name: /find events near me/i }));
      const radiusSelect = await screen.findByLabelText(/within/i);
      await user.selectOptions(radiusSelect, "25000");

      await waitFor(() =>
        expect(api.getEvents).toHaveBeenLastCalledWith(
          expect.objectContaining({ radius: 25000 })
        )
      );
    });

    it("drops coordinates when the location is cleared", async () => {
      const user = userEvent.setup();
      mockEvents([makeEvent()]);
      renderDiscovery();
      await screen.findByText(/showing/i);

      await user.click(screen.getByRole("button", { name: /find events near me/i }));
      await screen.findByRole("button", { name: /clear location/i });
      await user.click(screen.getByRole("button", { name: /clear location/i }));

      await waitFor(() =>
        expect(api.getEvents).toHaveBeenLastCalledWith(
          expect.not.objectContaining({ lat: expect.anything() })
        )
      );
    });

    it("shows a distance badge when the API returns one", async () => {
      mockEvents([makeEvent({ distanceMetres: 3519 })]);
      renderDiscovery();
      expect(await screen.findByText("3.5 km away")).toBeInTheDocument();
    });

    it("explains a denied permission instead of failing silently", async () => {
      Object.defineProperty(navigator, "geolocation", {
        value: {
          getCurrentPosition: vi.fn((_s, failure) =>
            failure?.({ code: 1 } as GeolocationPositionError)
          ),
        },
        configurable: true,
      });

      const user = userEvent.setup();
      mockEvents([makeEvent()]);
      renderDiscovery();
      await screen.findByText(/showing/i);

      await user.click(screen.getByRole("button", { name: /find events near me/i }));
      expect(await screen.findByText(/permission denied/i)).toBeInTheDocument();
    });
  });

  describe("list / map toggle", () => {
    it("starts on the list", async () => {
      mockEvents([makeEvent()]);
      renderDiscovery();
      await screen.findByText(/showing/i);

      expect(screen.queryByTestId("event-map")).not.toBeInTheDocument();
    });

    it("swaps to the map without refetching", async () => {
      const user = userEvent.setup();
      mockEvents([makeEvent(), makeEvent()]);
      renderDiscovery();
      await screen.findByText(/showing/i);
      const callsBefore = vi.mocked(api.getEvents).mock.calls.length;

      await user.click(screen.getByRole("button", { name: /map/i }));

      expect(await screen.findByTestId("event-map")).toHaveTextContent("2 pins");
      expect(vi.mocked(api.getEvents).mock.calls.length).toBe(callsBefore);
    });

    it("marks the active view for assistive tech", async () => {
      const user = userEvent.setup();
      mockEvents([makeEvent()]);
      renderDiscovery();
      await screen.findByText(/showing/i);

      await user.click(screen.getByRole("button", { name: /map/i }));

      expect(screen.getByRole("button", { name: /map/i })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: /list/i })).toHaveAttribute("aria-pressed", "false");
    });
  });

  describe("joining", () => {
    it("sends an unauthenticated user to log in without calling the API", async () => {
      const user = userEvent.setup();
      mockEvents([makeEvent()]);
      renderDiscovery();
      await screen.findByText(/showing/i);

      await user.click(screen.getByRole("button", { name: /login to join/i }));

      expect(await screen.findByText(landmarkText("login"))).toBeInTheDocument();
      expect(api.joinEvent).not.toHaveBeenCalled();
    });

    it("joins and shows the server's confirmation", async () => {
      const me = makeUser();
      const target = makeEvent({ title: "Sunday Football" });
      const user = userEvent.setup();

      mockEvents([target]);
      vi.mocked(api.joinEvent).mockResolvedValue({
        data: {
          success: true,
          message: 'You have successfully joined "Sunday Football"!',
          event: { ...target, currentPlayers: [...target.currentPlayers, makeUserRef({ _id: me._id })] },
        },
      } as Awaited<ReturnType<typeof api.joinEvent>>);

      renderDiscovery({ user: me });
      await screen.findByText(/showing/i);

      await user.click(screen.getByRole("button", { name: /join event/i }));

      expect(api.joinEvent).toHaveBeenCalledWith(target._id);
      expect(await screen.findByText(/successfully joined/i)).toBeInTheDocument();
    });

    it("updates the card in place after joining", async () => {
      const me = makeUser();
      const target = makeEvent({ maxPlayers: 10 });
      const user = userEvent.setup();

      mockEvents([target]);
      vi.mocked(api.joinEvent).mockResolvedValue({
        data: {
          success: true,
          message: "joined",
          event: {
            ...target,
            currentPlayers: [...target.currentPlayers, makeUserRef({ _id: me._id })],
          },
        },
      } as Awaited<ReturnType<typeof api.joinEvent>>);

      renderDiscovery({ user: me });
      await screen.findByText(/showing/i);
      await user.click(screen.getByRole("button", { name: /join event/i }));

      expect(await screen.findByText("2 / 10")).toBeInTheDocument();
    });

    it("surfaces a join failure as an error", async () => {
      const user = userEvent.setup();
      mockEvents([makeEvent()]);
      vi.mocked(api.joinEvent).mockRejectedValue(new Error("Event is already full."));
      vi.spyOn(console, "error").mockImplementation(() => {});

      renderDiscovery({ user: makeUser() });
      await screen.findByText(/showing/i);
      await user.click(screen.getByRole("button", { name: /join event/i }));

      expect(await screen.findByText(/already full/i)).toBeInTheDocument();
      vi.restoreAllMocks();
    });

    it("disables the button for an event the user already joined", async () => {
      const me = makeUser();
      mockEvents([
        makeEvent({ currentPlayers: [makeUserRef({ _id: me._id, name: me.name })] }),
      ]);

      renderDiscovery({ user: me });

      const btn = await screen.findByRole("button", { name: /already joined/i });
      expect(btn).toBeDisabled();
    });

    it("disables the button for a full event", async () => {
      mockEvents([makeFullEvent()]);
      renderDiscovery({ user: makeUser() });

      const btn = await screen.findByRole("button", { name: /event full/i });
      expect(btn).toBeDisabled();
    });

    it("clears the session and redirects when the token has expired", async () => {
      const user = userEvent.setup();
      mockEvents([makeEvent()]);

      const { AxiosError, AxiosHeaders } = await import("axios");
      const expired = new AxiosError("Unauthorized");
      expired.response = {
        status: 401,
        statusText: "",
        data: { success: false, message: "Token expired" },
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
      };
      vi.mocked(api.joinEvent).mockRejectedValue(expired);
      vi.spyOn(console, "error").mockImplementation(() => {});

      renderDiscovery({ user: makeUser() });
      await screen.findByText(/showing/i);
      await user.click(screen.getByRole("button", { name: /join event/i }));

      expect(await screen.findByText(landmarkText("login"))).toBeInTheDocument();
      // A stale token must not be left behind to fail the next request too.
      expect(getToken()).toBeNull();
      expect(getStoredUser()).toBeNull();
      vi.restoreAllMocks();
    });
  });

  describe("event cards", () => {
    it("links through to the detail page", async () => {
      const target = makeEvent({ _id: "abc123" });
      mockEvents([target]);
      renderDiscovery();

      const link = await screen.findByRole("link", { name: /view details/i });
      expect(link).toHaveAttribute("href", "/events/abc123");
    });

    it("shows how full each event is", async () => {
      mockEvents([
        makeEvent({
          maxPlayers: 8,
          currentPlayers: [makeUserRef(), makeUserRef(), makeUserRef()],
        }),
      ]);
      renderDiscovery();

      const card = (await screen.findByText("Sunday Morning Football")).closest(".event-card");
      expect(within(card as HTMLElement).getByText("3 / 8")).toBeInTheDocument();
    });
  });
});
