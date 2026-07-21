import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { setToken } from "./storage";

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>Login page</p>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <p>Secret dashboard</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );

describe("ProtectedRoute", () => {
  it("redirects to login when there is no token", () => {
    renderAt("/dashboard");

    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Secret dashboard")).not.toBeInTheDocument();
  });

  it("renders the protected content when a token is present", () => {
    setToken("a.valid.looking.token");
    renderAt("/dashboard");

    expect(screen.getByText("Secret dashboard")).toBeInTheDocument();
  });

  it("treats an empty-string token as unauthenticated", () => {
    // localStorage stores strings, so "" is a real possibility after a
    // partially-failed login.
    localStorage.setItem("token", "");
    renderAt("/dashboard");

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });
});
