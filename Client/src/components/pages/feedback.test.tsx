import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import Feedback from "./feedback";
import * as api from "../utils/api";
import { renderPage } from "../../test/renderPage";
import { makeFeedback, makeUser } from "../../test/factories";
import type { FeedbackDTO } from "@shared/api";

vi.mock("../utils/api");

const mockList = (items: FeedbackDTO[]) =>
  vi.mocked(api.getFeedback).mockResolvedValue({ data: items } as Awaited<
    ReturnType<typeof api.getFeedback>
  >);

const renderFeedback = () =>
  renderPage(<Feedback />, { route: "/feedback", path: "/feedback", user: makeUser() });

const rate = async (user: ReturnType<typeof userEvent.setup>, stars: number) =>
  user.click(screen.getByRole("button", { name: new RegExp(`rate ${stars} out of 5`, "i") }));

describe("Feedback", () => {
  beforeEach(() => {
    vi.mocked(api.getFeedback).mockReset();
    vi.mocked(api.postFeedback).mockReset();
    mockList([]);
  });

  describe("existing feedback", () => {
    it("lists what others have written", async () => {
      mockList([
        makeFeedback({ name: "Ahana Sharma", comment: "Great app." }),
        makeFeedback({ name: "Vikram Desai", comment: "Found a game in minutes." }),
      ]);
      renderFeedback();

      expect(await screen.findByText(/Great app\./)).toBeInTheDocument();
      expect(screen.getByText(/Found a game in minutes\./)).toBeInTheDocument();
      expect(screen.getByText("Ahana Sharma")).toBeInTheDocument();
    });

    it("does not display author email addresses", async () => {
      mockList([makeFeedback({ name: "Ahana Sharma", comment: "Great app." })]);
      const { container } = renderFeedback();

      await screen.findByText(/Great app\./);
      expect(container.textContent).not.toContain("@");
      expect(container.textContent).not.toContain("undefined");
    });

    it("survives a failed fetch", async () => {
      vi.mocked(api.getFeedback).mockRejectedValue(new Error("offline"));
      vi.spyOn(console, "error").mockImplementation(() => {});
      renderFeedback();

      expect(await screen.findByRole("button", { name: /submit feedback/i })).toBeInTheDocument();
      vi.restoreAllMocks();
    });
  });

  describe("the form", () => {
    it("does not ask for a name or email", async () => {
      renderFeedback();
      await waitFor(() => expect(api.getFeedback).toHaveBeenCalled());

      expect(screen.queryByPlaceholderText(/your name/i)).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/your email/i)).not.toBeInTheDocument();
    });

    it("refuses to submit without a rating", async () => {
      const user = userEvent.setup();
      renderFeedback();

      await user.type(screen.getByPlaceholderText(/write your feedback/i), "Nice app");
      await user.click(screen.getByRole("button", { name: /submit feedback/i }));

      expect(await screen.findByText(/please add a rating/i)).toBeInTheDocument();
      expect(api.postFeedback).not.toHaveBeenCalled();
    });

    it("refuses to submit without a comment", async () => {
      const user = userEvent.setup();
      renderFeedback();

      await rate(user, 5);
      await user.click(screen.getByRole("button", { name: /submit feedback/i }));

      expect(await screen.findByText(/please add a rating/i)).toBeInTheDocument();
      expect(api.postFeedback).not.toHaveBeenCalled();
    });

    it("submits the rating and comment", async () => {
      const user = userEvent.setup();
      vi.mocked(api.postFeedback).mockResolvedValue({
        data: makeFeedback({ rating: 4, comment: "Solid." }),
      } as Awaited<ReturnType<typeof api.postFeedback>>);

      renderFeedback();
      await rate(user, 4);
      await user.type(screen.getByPlaceholderText(/write your feedback/i), "Solid.");
      await user.click(screen.getByRole("button", { name: /submit feedback/i }));

      await waitFor(() =>
        expect(api.postFeedback).toHaveBeenCalledWith({ rating: 4, comment: "Solid." })
      );
    });

    it("shows the new entry without a refetch", async () => {
      const user = userEvent.setup();
      vi.mocked(api.postFeedback).mockResolvedValue({
        data: makeFeedback({ name: "Radha Raman", comment: "Just submitted." }),
      } as Awaited<ReturnType<typeof api.postFeedback>>);

      renderFeedback();
      await rate(user, 5);
      await user.type(screen.getByPlaceholderText(/write your feedback/i), "Just submitted.");
      await user.click(screen.getByRole("button", { name: /submit feedback/i }));

      expect(await screen.findByText(/Just submitted\./)).toBeInTheDocument();
      expect(api.getFeedback).toHaveBeenCalledTimes(1);
    });

    it("clears the form after a successful submit", async () => {
      const user = userEvent.setup();
      vi.mocked(api.postFeedback).mockResolvedValue({
        data: makeFeedback(),
      } as Awaited<ReturnType<typeof api.postFeedback>>);

      renderFeedback();
      await rate(user, 5);
      const box = screen.getByPlaceholderText(/write your feedback/i);
      await user.type(box, "Great");
      await user.click(screen.getByRole("button", { name: /submit feedback/i }));

      await waitFor(() => expect(box).toHaveValue(""));
    });

    it("reports a rejected submission", async () => {
      const err = new AxiosError("Request failed");
      err.response = {
        status: 401,
        statusText: "",
        data: { success: false, message: "Access denied. No token provided." },
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
      };
      vi.mocked(api.postFeedback).mockRejectedValue(err);
      vi.spyOn(console, "error").mockImplementation(() => {});

      const user = userEvent.setup();
      renderFeedback();
      await rate(user, 3);
      await user.type(screen.getByPlaceholderText(/write your feedback/i), "Hmm");
      await user.click(screen.getByRole("button", { name: /submit feedback/i }));

      expect(await screen.findByText(/access denied/i)).toBeInTheDocument();
      vi.restoreAllMocks();
    });
  });

  describe("rating stars", () => {
    it("exposes each star to assistive tech", () => {
      renderFeedback();
      expect(screen.getByRole("button", { name: /rate 1 out of 5/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /rate 5 out of 5/i })).toBeInTheDocument();
    });

    it("can be set from the keyboard", async () => {
      const user = userEvent.setup();
      vi.mocked(api.postFeedback).mockResolvedValue({
        data: makeFeedback(),
      } as Awaited<ReturnType<typeof api.postFeedback>>);

      renderFeedback();
      const star = screen.getByRole("button", { name: /rate 4 out of 5/i });
      star.focus();
      await user.keyboard("{Enter}");

      await user.type(screen.getByPlaceholderText(/write your feedback/i), "Keyboard only");
      await user.click(screen.getByRole("button", { name: /submit feedback/i }));

      await waitFor(() =>
        expect(api.postFeedback).toHaveBeenCalledWith(
          expect.objectContaining({ rating: 4 })
        )
      );
    });
  });
});
