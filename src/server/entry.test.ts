// @vitest-environment node
import type { Server } from "node:http";
import { describe, expect, it } from "vitest";

import app, { renderSsrDocument } from "./entry";

describe("renderSsrDocument", () => {
	const template = "<head><!--app-head--></head><body><!--app-html--></body>";

	it("fills both placeholders", () => {
		const out = renderSsrDocument(template, { head: "<title>x</title>", html: "<p>hi</p>" });
		expect(out).toBe("<head><title>x</title></head><body><p>hi</p></body>");
	});

	it("inserts $-sequences literally", () => {
		const out = renderSsrDocument(template, { head: "<title>Save $& today</title>", html: "$'" });
		expect(out).toContain("Save $& today");
		expect(out).toContain("<body>$'</body>");
	});
});

describe("app security wiring", () => {
	it("serves security headers and rate limits repeated sign-in attempts", async () => {
		const server: Server = await new Promise((r) => { const s = app.listen(0, "127.0.0.1", () => r(s)); });
		const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
		try {
			const health = await fetch(`${base}/api/health`);
			expect(health.headers.get("content-security-policy")).toContain("default-src 'self'");
			expect(health.headers.get("x-powered-by")).toBeNull();
			const statuses: number[] = [];
			for (let i = 0; i < 10; i++) {
				const res = await fetch(`${base}/api/auth/sign-in/email`, {
					method: "POST",
					headers: { "content-type": "application/json", origin: base },
					body: JSON.stringify({ email: "rate@example.test", password: "wrong-Pass-1!" }),
				});
				statuses.push(res.status);
			}
			expect(statuses.slice(0, 8)).not.toContain(429);
			expect(statuses.slice(8)).toEqual([429, 429]);
		} finally {
			await new Promise<void>((r) => server.close(() => r()));
		}
	});
});
