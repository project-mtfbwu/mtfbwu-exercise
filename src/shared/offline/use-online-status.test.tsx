import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { useOnlineStatus } from "@/shared/offline/use-online-status";
import { useOnlineStore } from "@/shared/offline/online-store";

function Probe() {
  const { status, isOnline, isOffline } = useOnlineStatus();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="online">{String(isOnline)}</span>
      <span data-testid="offline">{String(isOffline)}</span>
    </div>
  );
}

describe("useOnlineStatus", () => {
  it("reads navigator.onLine after mount", () => {
    useOnlineStore.setState({ status: "unknown" });
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => true,
    });

    render(<Probe />);
    expect(screen.getByTestId("status").textContent).toBe("online");
    expect(screen.getByTestId("online").textContent).toBe("true");
    expect(screen.getByTestId("offline").textContent).toBe("false");
  });
});
