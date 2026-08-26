// draw-bean.ts — canvas bean renderer for game pages (NOT used in Flappy/Crossy)
import { resolveLoadout, type AvatarLoadout } from '@/lib/avatar-catalog';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Canvas drawer — matches BeanAvatar look. */
export function drawBean(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  loadout: Partial<AvatarLoadout>,
  scale = 1,
  facing = 1,
  flap = 0,
) {
  const parts = resolveLoadout(loadout);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing < 0 ? -scale : scale, scale);

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 22, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // legs
  ctx.fillStyle = parts.pants.color;
  roundRect(ctx, -10, 8, 8, 12, 3);
  ctx.fill();
  roundRect(ctx, 2, 8, 8, 12, 3);
  ctx.fill();

  // shoes
  ctx.fillStyle = parts.shoes.color;
  ctx.beginPath();
  ctx.ellipse(-6, 20, 7, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(6, 20, 7, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // body
  ctx.fillStyle = parts.body.color;
  ctx.beginPath();
  ctx.ellipse(0, -2, 18, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // shirt
  ctx.fillStyle = parts.shirt.color;
  ctx.beginPath();
  ctx.moveTo(-16, -2);
  ctx.quadraticCurveTo(0, 10, 16, -2);
  ctx.lineTo(14, 12);
  ctx.quadraticCurveTo(0, 18, -14, 12);
  ctx.closePath();
  ctx.fill();

  // eyes
  const eyeY = -6 + flap * 0.5;
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(-5, eyeY, 3.5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(5, eyeY, 3.5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(-4, eyeY - 1, 1.2, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(6, eyeY - 1, 1.2, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // hat
  if (parts.hat.id === 'hat_cap') {
    ctx.fillStyle = parts.hat.color;
    ctx.beginPath();
    ctx.ellipse(0, -20, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(0, -24, 18, 5);
  } else if (parts.hat.id === 'hat_crown') {
    ctx.fillStyle = parts.hat.color;
    ctx.beginPath();
    ctx.moveTo(-12, -20);
    ctx.lineTo(-8, -30);
    ctx.lineTo(-4, -22);
    ctx.lineTo(0, -32);
    ctx.lineTo(4, -22);
    ctx.lineTo(8, -30);
    ctx.lineTo(12, -20);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}
