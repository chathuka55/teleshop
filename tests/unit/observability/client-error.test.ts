import { describe, expect, it } from "vitest";
import { clientErrorSchema, toError } from "@/lib/observability/client-error";
import { isRenderStandIn } from "@/lib/observability/request-error";

describe("isRenderStandIn (onRequestError de-duplication)", () => {
  it("skips Next's generic SSR copy of a Server Component error, keeps real errors", () => {
    const standIn = new Error(
      "An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details.",
    );
    expect(isRenderStandIn(standIn)).toBe(true);
    expect(isRenderStandIn(new Error("connect ECONNREFUSED 127.0.0.1:27017"))).toBe(false);
    expect(isRenderStandIn("An error occurred in the Server Components render")).toBe(false);
  });
});

describe("clientErrorSchema (POST /api/client-errors)", () => {
  it("accepts a normal report and defaults the name", () => {
    const r = clientErrorSchema.parse({
      message: "x is undefined",
      path: "/checkout",
      stack: "at f (a.js:1:1)",
    });
    expect(r).toEqual({
      name: "Error",
      message: "x is undefined",
      path: "/checkout",
      stack: "at f (a.js:1:1)",
    });
  });

  it.each([
    [{ message: "m", path: "https://evil.example/x" }, "absolute URL as path"],
    [{ message: "m", path: "/a b" }, "whitespace in path"],
    [{ message: "x".repeat(501), path: "/" }, "message too long"],
    [{ message: "m", path: "/", stack: "s".repeat(4001) }, "stack too long"],
    [{ path: "/" }, "missing message"],
  ])("rejects %j (%s)", (body, _why) => {
    expect(clientErrorSchema.safeParse(body).success).toBe(false);
  });

  it("rebuilds an Error with the browser's name and stack", () => {
    const err = toError({ name: "TypeError", message: "boom", path: "/", stack: "    at f (a.js:1:1)" });
    expect(err.name).toBe("TypeError");
    expect(err.stack).toBe("TypeError: boom\n    at f (a.js:1:1)");
  });
});
