import { expect, test } from "vitest";
import { name } from "../src/index.ts";

// Every file under test/ runs once per Vitest project, so the same test proves both runtimes.
const userAgents: Record<string, RegExp> = {
  workerd: /^Cloudflare-Workers$/,
  node: /^Node\.js\/(2[2-9]|[3-9]\d)$/,
};

test("runs on the runtime its project names", ({ task }) => {
  const expected = userAgents[task.file.projectName ?? ""];
  const { navigator } = globalThis as { navigator?: { userAgent?: string } };
  expect(expected, `unknown project ${task.file.projectName}`).toBeDefined();
  expect(navigator?.userAgent).toMatch(expected as RegExp);
});

test("the package names itself", () => {
  expect(name).toBe("pikkadon");
});
