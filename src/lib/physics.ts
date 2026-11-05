export const COURT = {
  width: 360, height: 440, gravity: 700, radius: 12,
  ballX: 110, ballY: 365, hoopX: 250, hoopY: 165, hoopHalfWidth: 32,
} as const;

export type Point = { x: number; y: number };
export type Ball = Point & { vx: number; vy: number; scored: boolean; age: number };

export function clampPull(pull: Point): Point {
  const length = Math.hypot(pull.x, pull.y);
  const ratio = length > 90 ? 90 / length : 1;
  return { x: pull.x * ratio, y: pull.y * ratio };
}

export function launch(pull: Point): Ball {
  const clamped = clampPull(pull);
  return {
    x: COURT.ballX, y: COURT.ballY,
    vx: -clamped.x * 8, vy: -clamped.y * 8, scored: false, age: 0,
  };
}

export function crossesBasket(previous: Point, next: Point, vy: number): boolean {
  if (vy <= 0 || previous.y >= COURT.hoopY || next.y < COURT.hoopY) return false;
  const fraction = (COURT.hoopY - previous.y) / (next.y - previous.y);
  const x = previous.x + (next.x - previous.x) * fraction;
  return Math.abs(x - COURT.hoopX) < COURT.hoopHalfWidth - COURT.radius - 2;
}

export function step(ball: Ball, dt: number): Ball {
  let next: Ball = {
    ...ball,
    x: ball.x + ball.vx * dt,
    y: ball.y + ball.vy * dt + COURT.gravity * dt * dt / 2,
    vy: ball.vy + COURT.gravity * dt,
    age: ball.age + dt,
  };
  if (!ball.scored && crossesBasket(ball, next, next.vy)) next.scored = true;

  if (!next.scored) {
    for (const rimX of [COURT.hoopX - COURT.hoopHalfWidth, COURT.hoopX + COURT.hoopHalfWidth]) {
      const dx = next.x - rimX;
      const dy = next.y - COURT.hoopY;
      const distance = Math.hypot(dx, dy);
      if (distance > 0 && distance < COURT.radius + 3) {
        const nx = dx / distance;
        const ny = dy / distance;
        const impact = next.vx * nx + next.vy * ny;
        next = { ...next, x: rimX + nx * 15, y: COURT.hoopY + ny * 15 };
        if (impact < 0) {
          next.vx -= 1.65 * impact * nx;
          next.vy -= 1.65 * impact * ny;
        }
      }
    }
    const boardX = COURT.hoopX + COURT.hoopHalfWidth + 6;
    if (next.y >= 92 && next.y <= 175 && ball.x + COURT.radius <= boardX && next.x + COURT.radius >= boardX) {
      next.x = boardX - COURT.radius;
      next.vx = -Math.abs(next.vx) * 0.65;
    }
  }
  return next;
}

export function shotFinished(ball: Ball): boolean {
  return ball.y > COURT.height + COURT.radius || ball.x < -60 ||
    ball.x > COURT.width + 60 || ball.age > 4;
}
