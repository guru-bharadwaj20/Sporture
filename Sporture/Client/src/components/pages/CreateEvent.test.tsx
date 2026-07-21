import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import CreateEvent from "./CreateEvent";
import * as api from "../utils/api";
import { renderPage, landmark, landmarkText } from "../../test/renderPage";
import { makeEvent, makeUser } from "../../test/factories";
import type { Coords } from "@shared/api";

vi.mock("../utils/api");

// The picker needs a measurable container, which jsdom has no layout for.
// A stub keeps this file about form behaviour; VenuePicker is covered by the
// browser pass and by EventMap's own tests.
vi.mock("../common/VenuePicker", () => ({
  default: ({ position, onPick }: { position: Coords | null; onPick: (c: Coords) => void }) => (
    <div data-testid="venue-picker">
      <span>{position ? `pinned:${position.lat},${position.lng}` : "no pin"}</span>
      <button type="button" onClick={() => onPick({ lat: 12.9, lng: 77.6 })}>
        drop pin
      </button>
    </div>
  ),
}));

const renderCreate = () =>
  renderPage(<CreateEvent />, {
    route: "/create-event",
    path: "/create-event",
    user: makeUser(),
    extraRoutes: [{ path: "/events/:id", element: landmark("detail") }],
  });

/** Fills every required field so a test can focus on one variable. */
const fillForm = async (
  user: ReturnType<typeof userEvent.setup>,
  over: Partial<Record<"title" | "sport" | "date" | "location" | "maxPlayers", string>> = {}
) => {
  await user.type(screen.getByPlaceholderText(/event title/i), over.title ?? "Sunday Football");
  await user.type(screen.getByPlaceholderText(/sport/i), over.sport ?? "Football");

  const dateInput = document.querySelector('input[name="date"]') as HTMLInputElement;
  await user.type(dateInput, over.date ?? "2027-09-15T18:30");

  await user.type(
    screen.getByPlaceholderText(/venue address/i),
    over.location ?? "Koramangala Turf, Bengaluru"
  );

  if (over.maxPlayers) {
    const players = document.querySelector('input[name="maxPlayers"]') as HTMLInputElement;
    await user.clear(players);
    await user.type(players, over.maxPlayers);
  }
};

describe("CreateEvent", () => {
  beforeEach(() => {
    vi.mocked(api.createEvent).mockReset();
    vi.mocked(api.createEvent).mockResolvedValue({
      data: makeEvent({ _id: "new-event-1" }),
    } as Awaited<ReturnType<typeof api.createEvent>>);
  });

  it("renders every required field", () => {
    renderCreate();
    expect(screen.getByPlaceholderText(/event title/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/sport/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/venue address/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create event/i })).toBeInTheDocument();
  });

  it("submits the typed values", async () => {
    const user = userEvent.setup();
    renderCreate();
    await fillForm(user);

    await user.click(screen.getByRole("button", { name: /create event/i }));

    await waitFor(() =>
      expect(api.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Sunday Football",
          sport: "Football",
          location: "Koramangala Turf, Bengaluru",
        })
      )
    );
  });

  it("navigates to the new event on success", async () => {
    const user = userEvent.setup();
    renderCreate();
    await fillForm(user);

    await user.click(screen.getByRole("button", { name: /create event/i }));

    expect(await screen.findByText(landmarkText("detail"))).toBeInTheDocument();
  });

  describe("location", () => {
    it("sends the address as a plain string when no pin is set", async () => {
      // The server geocodes it in that case.
      const user = userEvent.setup();
      renderCreate();
      await fillForm(user);

      await user.click(screen.getByRole("button", { name: /create event/i }));

      await waitFor(() => {
        const payload = vi.mocked(api.createEvent).mock.calls[0]?.[0];
        expect(typeof payload?.location).toBe("string");
      });
    });

    it("sends coordinates alongside the address once a pin is dropped", async () => {
      // A pin beats geocoding: an address resolves to a building centroid,
      // which can be a few hundred metres off a pitch inside a park.
      const user = userEvent.setup();
      renderCreate();
      await fillForm(user);

      await user.click(screen.getByRole("button", { name: /pick on map/i }));
      await user.click(await screen.findByRole("button", { name: /drop pin/i }));
      await user.click(screen.getByRole("button", { name: /create event/i }));

      await waitFor(() =>
        expect(api.createEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            location: {
              address: "Koramangala Turf, Bengaluru",
              lat: 12.9,
              lng: 77.6,
            },
          })
        )
      );
    });

    it("reverts to the plain address when the pin is cleared", async () => {
      const user = userEvent.setup();
      renderCreate();
      await fillForm(user);

      await user.click(screen.getByRole("button", { name: /pick on map/i }));
      await user.click(await screen.findByRole("button", { name: /drop pin/i }));
      await user.click(screen.getByRole("button", { name: /clear pin/i }));
      await user.click(screen.getByRole("button", { name: /create event/i }));

      await waitFor(() => {
        const payload = vi.mocked(api.createEvent).mock.calls[0]?.[0];
        expect(typeof payload?.location).toBe("string");
      });
    });

    it("shows the pinned coordinates so the choice is visible", async () => {
      const user = userEvent.setup();
      renderCreate();

      await user.click(screen.getByRole("button", { name: /pick on map/i }));
      await user.click(await screen.findByRole("button", { name: /drop pin/i }));

      expect(screen.getByText(/pinned at 12\.90000, 77\.60000/i)).toBeInTheDocument();
    });

    it("toggles the map open and shut", async () => {
      const user = userEvent.setup();
      renderCreate();

      expect(screen.queryByTestId("venue-picker")).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /pick on map/i }));
      expect(screen.getByTestId("venue-picker")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /hide map/i }));
      expect(screen.queryByTestId("venue-picker")).not.toBeInTheDocument();
    });

    it("seeds the pin from the browser location", async () => {
      Object.defineProperty(navigator, "geolocation", {
        value: {
          getCurrentPosition: vi.fn((success) =>
            success({ coords: { latitude: 13.1, longitude: 77.7 } } as GeolocationPosition)
          ),
        },
        configurable: true,
      });

      const user = userEvent.setup();
      renderCreate();

      await user.click(screen.getByRole("button", { name: /use my location/i }));

      expect(await screen.findByText(/pinned at 13\.10000, 77\.70000/i)).toBeInTheDocument();
      // Opening the map lets the user correct an imprecise fix.
      expect(screen.getByTestId("venue-picker")).toBeInTheDocument();
    });
  });

  describe("failures", () => {
    it("shows per-field validation messages, not the generic one", async () => {
      const err = new AxiosError("Request failed");
      err.response = {
        status: 400,
        statusText: "",
        data: {
          success: false,
          message: "Validation failed",
          details: ["title: must be at least 3 characters", "date: must be in the future"],
        },
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
      };
      vi.mocked(api.createEvent).mockRejectedValue(err);
      vi.spyOn(console, "error").mockImplementation(() => {});

      const user = userEvent.setup();
      renderCreate();
      await fillForm(user);
      await user.click(screen.getByRole("button", { name: /create event/i }));

      expect(await screen.findByText(/must be at least 3 characters/)).toBeInTheDocument();
      expect(screen.getByText(/must be in the future/)).toBeInTheDocument();
      vi.restoreAllMocks();
    });

    it("explains an unreachable geocoder", async () => {
      const err = new AxiosError("Request failed");
      err.response = {
        status: 503,
        statusText: "",
        data: { success: false, message: "Could not reach the geocoding service." },
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
      };
      vi.mocked(api.createEvent).mockRejectedValue(err);
      vi.spyOn(console, "error").mockImplementation(() => {});

      const user = userEvent.setup();
      renderCreate();
      await fillForm(user);
      await user.click(screen.getByRole("button", { name: /create event/i }));

      expect(await screen.findByText(/geocoding service/i)).toBeInTheDocument();
      vi.restoreAllMocks();
    });

    it("stays on the form after a failure so input isn't lost", async () => {
      vi.mocked(api.createEvent).mockRejectedValue(new Error("boom"));
      vi.spyOn(console, "error").mockImplementation(() => {});

      const user = userEvent.setup();
      renderCreate();
      await fillForm(user);
      await user.click(screen.getByRole("button", { name: /create event/i }));

      await screen.findByText(/boom/i);
      expect(screen.getByPlaceholderText(/event title/i)).toHaveValue("Sunday Football");
      expect(screen.queryByText(landmarkText("detail"))).not.toBeInTheDocument();
      vi.restoreAllMocks();
    });

    it("re-enables the submit button after a failure", async () => {
      vi.mocked(api.createEvent).mockRejectedValue(new Error("boom"));
      vi.spyOn(console, "error").mockImplementation(() => {});

      const user = userEvent.setup();
      renderCreate();
      await fillForm(user);
      await user.click(screen.getByRole("button", { name: /create event/i }));

      await screen.findByText(/boom/i);
      expect(screen.getByRole("button", { name: /create event/i })).toBeEnabled();
      vi.restoreAllMocks();
    });
  });

  it("disables submit while the request is in flight", async () => {
    // Otherwise an impatient double-click creates the event twice.
    let release: (v: unknown) => void = () => {};
    vi.mocked(api.createEvent).mockReturnValue(
      new Promise((r) => {
        release = r;
      }) as never
    );

    const user = userEvent.setup();
    renderCreate();
    await fillForm(user);

    // fireEvent, not userEvent: userEvent waits for the DOM to settle after a
    // click, which never happens while the request is deliberately pending.
    fireEvent.submit(document.querySelector("form") as HTMLFormElement);

    expect(await screen.findByRole("button", { name: /creating/i })).toBeDisabled();
    release({ data: makeEvent() });
  });
});
