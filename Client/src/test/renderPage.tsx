import { render, type RenderResult } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { ReactElement } from "react";
import { ToastProvider } from "../components/common/ToastProvider";
import { setStoredUser, setToken } from "../components/utils/storage";
import type { UserDTO } from "@shared/api";

interface Options {
  /** Initial URL. Use when the page reads a route param. */
  route?: string;
  /** Route pattern the page is mounted at, e.g. "/events/:id". */
  path?: string;
  /** Signs a user in before rendering. */
  user?: UserDTO | null;
  /** Extra routes so navigation away from the page is observable. */
  extraRoutes?: Array<{ path: string; element: ReactElement }>;
}

/**
 * Renders a page with the providers it expects at runtime.
 *
 * Pages call useToast and useNavigate, so rendering one bare throws before any
 * assertion runs. Signing the user in here rather than in each test keeps the
 * arrange step to one line.
 */
export const renderPage = (
  ui: ReactElement,
  { route = "/", path = "*", user = null, extraRoutes = [] }: Options = {}
): RenderResult => {
  if (user) {
    setToken("test.jwt.token");
    setStoredUser(user);
  }

  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <Routes>
          <Route path={path} element={ui} />
          {extraRoutes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
        </Routes>
      </ToastProvider>
    </MemoryRouter>
  );
};

/** Marker elements for asserting that a page navigated somewhere. */
export const landmark = (name: string): ReactElement => <p>{`__${name}__`}</p>;
export const landmarkText = (name: string): string => `__${name}__`;
