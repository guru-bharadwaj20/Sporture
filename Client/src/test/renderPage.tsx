import { render, type RenderResult } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { ReactElement } from "react";
import { ToastProvider } from "../components/common/ToastProvider";
import { setStoredUser, setToken } from "../components/utils/storage";
import type { UserDTO } from "@shared/api";

interface Options {
  route?: string;
  path?: string;
  user?: UserDTO | null;
  extraRoutes?: Array<{ path: string; element: ReactElement }>;
}

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

export const landmark = (name: string): ReactElement => <p>{`__${name}__`}</p>;
export const landmarkText = (name: string): string => `__${name}__`;
