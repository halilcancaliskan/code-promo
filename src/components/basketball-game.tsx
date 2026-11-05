"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { COURT, clampPull, launch, shotFinished, step, type Ball, type Point } from "@/lib/physics";

type Props = { accent: string; onWin: () => void };

function controlsPull(angle: number, power: number): Point {
  const radians = angle * Math.PI / 180;
  return { x: -power * Math.cos(radians), y: power * Math.sin(radians) };
}

export default function BasketballGame({ accent, onWin }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballRef = useRef<Ball | null>(null);
  const pullRef = useRef<Point | null>(null);
  const controlsPullRef = useRef<Point>(controlsPull(79, 76));
  const pointerRef = useRef<number | null>(null);
  const scoreRef = useRef(0);
  const onWinRef = useRef(onWin);
  const [score, setScore] = useState(0);
  const [shooting, setShooting] = useState(false);
  const [feedback, setFeedback] = useState("Tirez le ballon vers le bas, puis relâchez.");
  const [angle, setAngle] = useState(79);
  const [power, setPower] = useState(76);
  useEffect(() => { onWinRef.current = onWin; }, [onWin]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Le navigateur ne prend pas en charge Canvas 2D.");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = COURT.width * dpr;
    canvas.height = COURT.height * dpr;
    ctx.scale(dpr, dpr);
    let frame = 0;
    let previousTime = 0;
    let accumulator = 0;
    let winAt: number | null = null;

    function draw(time: number) {
      if (!ctx) return;
      const dt = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
      previousTime = time;
      accumulator += dt;
      while (accumulator >= 1 / 120) {
        if (ballRef.current) {
          const before = ballRef.current;
          const next = step(before, 1 / 120);
          ballRef.current = next;
          if (!before.scored && next.scored) {
            scoreRef.current += 1;
            setScore(scoreRef.current);
            setFeedback(scoreRef.current === 3 ? "Troisième panier ! Votre code arrive." : "Dans le mille ! Encore un petit effort.");
            if (scoreRef.current === 3) winAt = time + 650;
          }
          if (shotFinished(next)) {
            if (!next.scored) setFeedback("Presque ! Ajustez la trajectoire et réessayez.");
            ballRef.current = null;
            setShooting(false);
          }
        }
        accumulator -= 1 / 120;
      }
      ctx.clearRect(0, 0, COURT.width, COURT.height);
      ctx.fillStyle = "#f4e9d8";
      ctx.fillRect(0, 0, 360, 440);
      ctx.fillStyle = "#ebdcc5";
      ctx.fillRect(0, 300, 360, 140);
      ctx.strokeStyle = "#dcc7a8";
      ctx.lineWidth = 1;
      for (let y = 318; y < 440; y += 24) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(360, y); ctx.stroke();
      }
      ctx.strokeStyle = "#fff9ed";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(180, 390, 100, 30, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#decdb3";
      ctx.font = "bold 58px Arial";
      ctx.fillText("03", 22, 92);
      ctx.fillStyle = "#637168";
      ctx.fillRect(289, 107, 8, 194);
      ctx.fillStyle = "#fffcf6";
      ctx.fillRect(221, 89, 75, 64);
      ctx.strokeStyle = "#b9afa0";
      ctx.lineWidth = 3;
      ctx.strokeRect(221, 89, 75, 64);
      ctx.strokeStyle = accent;
      ctx.strokeRect(245, 113, 30, 28);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath(); ctx.moveTo(218 + i * 16, 167); ctx.lineTo(231 + i * 9, 204); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(223, 181); ctx.lineTo(277, 181); ctx.moveTo(228, 195); ctx.lineTo(272, 195); ctx.stroke();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(218, 165); ctx.lineTo(282, 165); ctx.stroke();

      const pull = pullRef.current ?? controlsPullRef.current;
      if (!ballRef.current && scoreRef.current < 3) {
        const preview = launch(pull);
        ctx.fillStyle = "#7e6b54";
        for (let t = 0.08; t <= 1.6; t += 0.08) {
          const x = preview.x + preview.vx * t;
          const y = preview.y + preview.vy * t + COURT.gravity * t * t / 2;
          if (y > 428) break;
          ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
        }
        if (pullRef.current) {
          ctx.strokeStyle = "#bca58a";
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(COURT.ballX, COURT.ballY);
          ctx.lineTo(COURT.ballX + pull.x, COURT.ballY + pull.y); ctx.stroke();
        }
      }
      const ball = ballRef.current ?? { x: COURT.ballX, y: COURT.ballY };
      ctx.fillStyle = "rgba(85, 61, 31, .12)";
      ctx.beginPath(); ctx.ellipse(ball.x, 418, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.translate(ball.x, ball.y);
      ctx.rotate(ballRef.current ? ballRef.current.age * 3 : 0);
      ctx.fillStyle = "#dc692f";
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#69361e"; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
      ctx.moveTo(0, -12); ctx.lineTo(0, 12); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, 6, 12, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      if (winAt !== null && time >= winAt) { onWinRef.current(); return; }
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [accent]);

  function point(event: PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * 360 / rect.width, y: (event.clientY - rect.top) * 440 / rect.height };
  }
  function shoot(pull: Point) {
    if (ballRef.current || scoreRef.current >= 3) return;
    pullRef.current = null;
    ballRef.current = launch(pull);
    setShooting(true);
    setFeedback("Le ballon est en l'air…");
  }
  function pointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (ballRef.current || scoreRef.current >= 3 || pointerRef.current !== null) return;
    const p = point(event);
    if (Math.hypot(p.x - COURT.ballX, p.y - COURT.ballY) > 42) return;
    pointerRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    pullRef.current = { x: 0, y: 0 };
  }
  function pointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (pointerRef.current !== event.pointerId) return;
    const p = point(event);
    pullRef.current = clampPull({ x: p.x - COURT.ballX, y: p.y - COURT.ballY });
  }
  function pointerUp(event: PointerEvent<HTMLCanvasElement>) {
    if (pointerRef.current !== event.pointerId) return;
    pointerRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const pull = pullRef.current;
    pullRef.current = null;
    if (pull && Math.hypot(pull.x, pull.y) >= 8) shoot(pull);
  }

  return (
    <section className="game" aria-label="Jeu de basketball">
      <div className="score-row"><span>Votre défi</span><strong aria-label={`${score} paniers sur 3`}>{score}<span> / 3</span></strong></div>
      <canvas ref={canvasRef} className="court" role="img"
        aria-label="Terrain de basketball. Glissez depuis le ballon vers le bas et légèrement à gauche pour tirer. Les commandes accessibles sont sous le terrain."
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
        onPointerCancel={() => { pointerRef.current = null; pullRef.current = null; }}>
        Utilisez les commandes de tir sous le terrain.
      </canvas>
      <p className="game-feedback" role="status" aria-live="polite">{feedback}</p>
      <details className="keyboard-controls" open>
        <summary>Commandes de tir · clavier ou tactile</summary>
        <div className="sliders">
          <label>Angle : {angle}°<input type="range" min="45" max="88" value={angle} disabled={shooting} onChange={(e) => {
            const value = Number(e.target.value);
            controlsPullRef.current = controlsPull(value, power);
            setAngle(value);
          }} /></label>
          <label>Force : {power}<input type="range" min="35" max="90" value={power} disabled={shooting} onChange={(e) => {
            const value = Number(e.target.value);
            controlsPullRef.current = controlsPull(angle, value);
            setPower(value);
          }} /></label>
        </div>
        <button className="primary full" disabled={shooting || score >= 3} onClick={() => {
          shoot(controlsPullRef.current);
        }}>{shooting ? "Tir en cours…" : "Tirer le ballon"} <span aria-hidden="true">↗</span></button>
      </details>
    </section>
  );
}
