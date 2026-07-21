import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import Login from "./Login";
import * as api from "../utils/api";
import { renderPage, landmark, landmarkText } from "../../test/renderPage";
import { makeUser } from "../../test/factories";
import { getToken, getStoredUser } from "../utils/storage";

vi.mock("../utils/api");

const renderLogin = () =>
  renderPage(<Login />, {
    route: "/login",
    path: "/login",
    extraRoutes: [{ path: "/dashboard", element: landmark("dashboard") }],
  });

const fillCredentials = async (
  user: ReturnType<typeof userEvent.setup>,
  email = "radha@example.com",
  password = "Password123!"
) => {
  await user.type(screen.getByPlaceholderText(/email/i), email);
  await user.type(screen.getByPlaceholderText(/password/i), password);
};

describe("Login", () => {
  const account = makeUser();

  beforeEach(() => {
    vi.mocked(api.loginUser).mockReset();
    vi.mocked(api.getCurrentUser).mockReset();
    vi.mocked(api.loginUser).mockResolvedValue({
      data: { success: true, token: "jwt.token.here", user: account },
    } as Awaited<ReturnType<typeof api.loginUser>>);
    vi.mocked(api.getCurrentUser).mockResolvedValue({
      data: { success: true, user: account },
    } as Awaited<ReturnType<typeof api.getCurrentUser>>);
  });

  it("sends the typed credentials", async () => {
    const user = userEvent.setup();
    renderLogin();
    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: /login|sign in/i }));

    await waitFor(() =>
      expect(api.loginUser).toHaveBeenCalledWith({
        email: "radha@example.com",
        password: "Password123!",
      })
    );
  });

  it("stores the token and user on success", async () => {
    const user = userEvent.setup();
    renderLogin();
    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: /login|sign in/i }));

    await waitFor(() => expect(getToken()).toBe("jwt.token.here"));
    expect(getStoredUser()?._id).toBe(account._id);
  });

  it("prefers the server's own record over the login payload", async () => {
    const fresher = makeUser({ name: "Renamed On Server" });
    vi.mocked(api.getCurrentUser).mockResolvedValue({
      data: { success: true, user: fresher },
    } as Awaited<ReturnType<typeof api.getCurrentUser>>);

    const user = userEvent.setup();
    renderLogin();
    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: /login|sign in/i }));

    await waitFor(() => expect(getStoredUser()?.name).toBe("Renamed On Server"));
  });

  it("falls back to the login payload when /me fails", async () => {
    vi.mocked(api.getCurrentUser).mockRejectedValue(new Error("me failed"));
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const user = userEvent.setup();
    renderLogin();
    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: /login|sign in/i }));

    await waitFor(() => expect(getStoredUser()?._id).toBe(account._id));
    vi.restoreAllMocks();
  });

  it("lands on the dashboard", async () => {
    const user = userEvent.setup();
    renderLogin();
    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: /login|sign in/i }));

    expect(await screen.findByText(landmarkText("dashboard"), {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it("shows the server's message on bad credentials", async () => {
    const err = new AxiosError("Request failed");
    err.response = {
      status: 401,
      statusText: "",
      data: { success: false, message: "Invalid credentials" },
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    };
    vi.mocked(api.loginUser).mockRejectedValue(err);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const user = userEvent.setup();
    renderLogin();
    await fillCredentials(user, "radha@example.com", "wrong");
    await user.click(screen.getByRole("button", { name: /login|sign in/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("stores nothing when login fails", async () => {
    vi.mocked(api.loginUser).mockRejectedValue(new Error("nope"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const user = userEvent.setup();
    renderLogin();
    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: /login|sign in/i }));

    await screen.findByText(/nope/i);
    expect(getToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
    vi.restoreAllMocks();
  });

  it("links to registration", () => {
    renderLogin();
    expect(screen.getByRole("link", { name: /register|sign up/i })).toBeInTheDocument();
  });
});
