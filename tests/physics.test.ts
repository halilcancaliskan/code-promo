import { strict as assert } from "node:assert";
import { test } from "node:test";
import { clampPull, COURT, crossesBasket, launch, shotFinished, step } from "../src/lib/physics.ts";

test("un panier exige un passage descendant et une marge pour le ballon", () => {
  assert.equal(crossesBasket({ x: 250, y: 160 }, { x: 250, y: 170 }, 100), true);
  assert.equal(crossesBasket({ x: 250, y: 170 }, { x: 250, y: 160 }, -100), false);
  assert.equal(crossesBasket({ x: 231, y: 160 }, { x: 231, y: 170 }, 100), false);
  assert.equal(crossesBasket({ x: 250, y: 180 }, { x: 250, y: 190 }, 100), false);
});

test("interpolation au point de franchissement du panier", () => {
  assert.equal(crossesBasket({ x: 220, y: 160 }, { x: 280, y: 170 }, 100), true);
});

test("le geste par défaut marque un seul panier par tir", () => {
  const radians = 79 * Math.PI / 180;
  let ball = launch({ x: -76 * Math.cos(radians), y: 76 * Math.sin(radians) });
  let crossings = 0;
  while (!shotFinished(ball)) {
    const next = step(ball, 1 / 120);
    if (!ball.scored && next.scored) crossings++;
    ball = next;
  }
  assert.equal(crossings, 1);
});

test("un tir trop faible échoue et termine ; les nouveaux tirs restent possibles", () => {
  let ball = launch({ x: -5, y: 10 });
  for (let i = 0; i < 500 && !shotFinished(ball); i++) ball = step(ball, 1 / 120);
  assert.equal(ball.scored, false);
  assert.equal(shotFinished(ball), true);
  assert.equal(launch({ x: -15, y: 75 }).scored, false);
});

test("la force est bornée et la trajectoire applique la gravité", () => {
  assert.ok(Math.hypot(...Object.values(clampPull({ x: 500, y: 500 }))) <= 90.00001);
  assert.deepEqual(clampPull({ x: 0, y: 0 }), { x: 0, y: 0 });
  const ball = launch({ x: -10, y: 70 });
  const next = step(ball, 0.01);
  assert.equal(next.vy, ball.vy + COURT.gravity * 0.01);
});
