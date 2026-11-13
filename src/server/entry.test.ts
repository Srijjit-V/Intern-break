import { describe, expect, it } from "vitest";

import { renderSsrDocument } from "./entry";

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
