import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isHostMessage, PROTOCOL } from "../src/lib/protocol.ts";
import { getShop } from "../src/lib/shops.ts";

test("messages typés : protocole, canal et données sont obligatoires", () => {
  const message = { protocol: PROTOCOL, channel: "abc", type: "init", completed: false };
  assert.equal(isHostMessage(message, "abc"), true);
  for (const invalid of [null, [], "abc", { ...message, channel: "other" },
    { ...message, protocol: "other" }, { ...message, completed: "yes" }, { ...message, type: "completed" }]) {
    assert.equal(isHostMessage(invalid, "abc"), false);
  }
  assert.equal(isHostMessage({ protocol: PROTOCOL, channel: "abc", type: "focus", edge: "last" }, "abc"), true);
});

test("seuls les identifiants de boutiques propres à la configuration sont acceptés", () => {
  assert.equal(getShop("demo")?.frequency, "session");
  assert.equal(getShop("toString"), undefined);
  assert.equal(getShop("__proto__"), undefined);
  assert.equal(getShop("unknown"), undefined);
});
