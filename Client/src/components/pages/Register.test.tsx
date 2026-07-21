import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import Register from "./Register";
import * as api from "../utils/api";
import { renderPage, landmark, landmarkText } from "../../test/renderPage";
import { makeUser } from "../../test/factories";

vi.mock("../utils/api");

const renderRegister = () =>
  renderPage(<Register />, {
    route: "/register",
    path: "/register",
    extraRoutes: [{ path: "/login", element: landmark("login") }],
  });

const fill = async (
  user: ReturnType<typeof userEvent.setup>,
  over: Partial<Record<"name" | "email" | "password" | "confirm", string>> = {}
) => {
  await user.type(screen.getByPlaceholderText(/full name|name/i), over.name ?? "Radha Raman");
  await user.type(screen.getByPlaceholderText(/email/i), over.email ?? "radha@example.com");

  const pw = document.querySelector('input[name="password"]') as HTMLInputElement;
  const confirm = document.querySelector('input[name="confirmPassword"]') as HTMLInputElement;
  await user.type(pw, over.password ?? "SuperSecret123");
  await user.type(confirm, over.confirm ?? over.password ?? "SuperSecret123");
};

describe("Register", () => {
  beforeEach(() => {
    vi.mocked(api.registerUser).mockReset();
    vi.mocked(api.registerUser).mockResolvedValue({
      data: { success: true, token: "jwt", user: makeUser() },
    } as Awaited<ReturnType<typeof api.registerUser>>);
  });

  it("requires at least one favourite sport", async () => {
    const user = userEvent.setup();
    renderRegister();
    await fill(user);
    await user.click(screen.getByRole("button", { name: /register|create account|sign up/i }));

    expect(await screen.findByText(/at least one favorite sport/i)).toBeInTheDocument();
    expect(api.registerUser).not.toHaveBeenCalled();
  });

  it("enforces the same password length as the server", async () => {
    const user = userEvent.setup();
    renderRegister();
    await fill(user, { password: "Short12" });
    await user.click(screen.getByRole("checkbox", { name: /football/i }));
    await user.click(screen.getByRole("button", { name: /register|create account|sign up/i }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(api.registerUser).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords before calling the API", async () => {
    const user = userEvent.setup();
    renderRegister();
    await fill(user, { password: "SuperSecret123", confirm: "Different123" });
    await user.click(screen.getByRole("checkbox", { name: /football/i }));
    await user.click(screen.getByRole("button", { name: /register|create account|sign up/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(api.registerUser).not.toHaveBeenCalled();
  });

  it("submits the chosen sports", async () => {
    const user = userEvent.setup();
    renderRegister();
    await fill(user);
    await user.click(screen.getByRole("checkbox", { name: /football/i }));
    await user.click(screen.getByRole("checkbox", { name: /cricket/i }));
    await user.click(screen.getByRole("button", { name: /register|create account|sign up/i }));

    await waitFor(() =>
      expect(api.registerUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Radha Raman",
          email: "radha@example.com",
          favSports: expect.arrayContaining(["Football", "Cricket"]),
        })
      )
    );
  });

  it("never sends the confirmation field", async () => {
    const user = userEvent.setup();
    renderRegister();
    await fill(user);
    await user.click(screen.getByRole("checkbox", { name: /football/i }));
    await user.click(screen.getByRole("button", { name: /register|create account|sign up/i }));

    await waitFor(() => expect(api.registerUser).toHaveBeenCalled());
    const payload = vi.mocked(api.registerUser).mock.calls[0]?.[0];
    expect(payload).not.toHaveProperty("confirmPassword");
  });

  it("toggles a sport off when clicked twice", async () => {
    const user = userEvent.setup();
    renderRegister();
    await fill(user);

    const football = screen.getByRole("checkbox", { name: /football/i });
    await user.click(football);
    await user.click(football);
    await user.click(screen.getByRole("checkbox", { name: /tennis/i }));
    await user.click(screen.getByRole("button", { name: /register|create account|sign up/i }));

    await waitFor(() => expect(api.registerUser).toHaveBeenCalled());
    const payload = vi.mocked(api.registerUser).mock.calls[0]?.[0];
    expect(payload?.favSports).toEqual(["Tennis"]);
  });

  it("sends the user to log in after signing up", async () => {
    const user = userEvent.setup();
    renderRegister();
    await fill(user);
    await user.click(screen.getByRole("checkbox", { name: /football/i }));
    await user.click(screen.getByRole("button", { name: /register|create account|sign up/i }));

    expect(
      await screen.findByText(landmarkText("login"), {}, { timeout: 3000 })
    ).toBeInTheDocument();
  });

  it("surfaces a duplicate-email rejection", async () => {
    const err = new AxiosError("Request failed");
    err.response = {
      status: 409,
      statusText: "",
      data: { success: false, message: "An account with that email already exists" },
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    };
    vi.mocked(api.registerUser).mockRejectedValue(err);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const user = userEvent.setup();
    renderRegister();
    await fill(user);
    await user.click(screen.getByRole("checkbox", { name: /football/i }));
    await user.click(screen.getByRole("button", { name: /register|create account|sign up/i }));

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("shows per-field validation messages", async () => {
    const err = new AxiosError("Request failed");
    err.response = {
      status: 400,
      statusText: "",
      data: {
        success: false,
        message: "Validation failed",
        details: ["password: must be at least 8 characters"],
      },
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    };
    vi.mocked(api.registerUser).mockRejectedValue(err);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const user = userEvent.setup();
    renderRegister();
    await fill(user);
    await user.click(screen.getByRole("checkbox", { name: /football/i }));
    await user.click(screen.getByRole("button", { name: /register|create account|sign up/i }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
