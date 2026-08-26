import { Helmet } from '@dr.pogodin/react-helmet';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from 'motion/react';
import AppLayout from '@/layouts/AppLayout';
import { getUser, recordFlappyRun } from '@/lib/ibs-store';
import { RotateCcw, Trophy, Bird, CircleAlert, Camera, X } from 'lucide-react';
import GameBackButton from '@/components/GameBackButton';

// ─── Game constants ────────────────────────────────────────────────────────────

const W = 400;
const H = 550;
const GROUND_H = 74;
const BIRD_X = 80;
const BIRD_R = 15;

// Easier + smoother physics
const GRAVITY = 0.255;
const JUMP = -6.05;
const MAX_FALL_SPEED = 7.2;

// Easier pipe settings
const PIPE_W = 58;
const PIPE_GAP = 182;
const PIPE_SPEED = 2.15;
const PIPE_INTERVAL = 112;
type GameState = 'idle' | 'playing' | 'dead';
type BirdStyle = 'color' | 'photo';
interface Pipe {
  x: number;
  topH: number;
  scored: boolean;
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  r: number;
}
const BIRD_COLORS = ['#f97316', '#ef4444', '#facc15', '#22c55e', '#38bdf8', '#8b5cf6', '#ec4899', '#1BDBDB'];

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function shadeColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, (num >> 8 & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `rgb(${r},${g},${b})`;
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
function drawPixelText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, fill = '#ffffff', stroke = '#111827') {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${size}px "Space Grotesk", Arial, sans-serif`;
  ctx.lineWidth = Math.max(3, size * 0.16);
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}
function drawBackground(ctx: CanvasRenderingContext2D, offset: number) {
  // Classic bright sky
  const sky = ctx.createLinearGradient(0, 0, 0, H - GROUND_H);
  sky.addColorStop(0, '#55c8d8');
  sky.addColorStop(0.62, '#73d8df');
  sky.addColorStop(1, '#bff8e6');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Soft clouds
  const cloudOffset = offset * 0.18 % W;
  for (let i = -1; i < 4; i += 1) {
    const cx = i * 150 - cloudOffset;
    const cy = 320 + i % 2 * 18;
    ctx.fillStyle = 'rgba(236,255,220,0.92)';
    ctx.beginPath();
    ctx.arc(cx + 10, cy + 18, 18, 0, Math.PI * 2);
    ctx.arc(cx + 30, cy + 8, 25, 0, Math.PI * 2);
    ctx.arc(cx + 58, cy + 15, 21, 0, Math.PI * 2);
    ctx.arc(cx + 82, cy + 23, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx + 8, cy + 18, 78, 20);
  }

  // Distant city
  const cityOffset = offset * 0.08 % W;
  for (let i = -1; i < 14; i += 1) {
    const bx = i * 38 - cityOffset;
    const bh = 22 + i * 13 % 32;
    const by = H - GROUND_H - 78 - bh;
    ctx.fillStyle = 'rgba(79, 172, 173, 0.25)';
    ctx.fillRect(bx, by, 28, bh);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let wy = by + 6; wy < by + bh - 4; wy += 10) {
      ctx.fillRect(bx + 5, wy, 5, 5);
      ctx.fillRect(bx + 16, wy, 5, 5);
    }
  }

  // Bushes
  const bushOffset = offset * 0.28 % W;
  ctx.fillStyle = '#5be076';
  for (let i = -2; i < 8; i += 1) {
    const bx = i * 78 - bushOffset;
    const by = H - GROUND_H - 40;
    ctx.beginPath();
    ctx.arc(bx + 10, by + 22, 22, 0, Math.PI * 2);
    ctx.arc(bx + 35, by + 12, 28, 0, Math.PI * 2);
    ctx.arc(bx + 65, by + 22, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  // Grass
  ctx.fillStyle = '#36c95d';
  ctx.fillRect(0, H - GROUND_H - 16, W, 22);

  // Ground top stripe
  ctx.fillStyle = '#9be53d';
  ctx.fillRect(0, H - GROUND_H, W, 18);
  const stripeOffset = offset % 32;
  for (let x = -32 - stripeOffset; x < W + 32; x += 32) {
    ctx.fillStyle = '#62c934';
    ctx.beginPath();
    ctx.moveTo(x, H - GROUND_H + 18);
    ctx.lineTo(x + 18, H - GROUND_H);
    ctx.lineTo(x + 32, H - GROUND_H);
    ctx.lineTo(x + 14, H - GROUND_H + 18);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = '#399c2b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, H - GROUND_H);
  ctx.lineTo(W, H - GROUND_H);
  ctx.stroke();

  // Dirt
  ctx.fillStyle = '#ddd996';
  ctx.fillRect(0, H - GROUND_H + 18, W, GROUND_H - 18);
}
function drawPipe(ctx: CanvasRenderingContext2D, pipe: Pipe) {
  const topY = pipe.topH;
  const botY = topY + PIPE_GAP;
  function pipeGradient(x: number) {
    const g = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
    g.addColorStop(0, '#8cc63f');
    g.addColorStop(0.18, '#d9f99d');
    g.addColorStop(0.45, '#84cc16');
    g.addColorStop(0.72, '#4d7c0f');
    g.addColorStop(1, '#2f5f0b');
    return g;
  }

  // Top pipe
  ctx.fillStyle = pipeGradient(pipe.x);
  ctx.fillRect(pipe.x, 0, PIPE_W, topY - 10);
  ctx.strokeStyle = '#1f3d0a';
  ctx.lineWidth = 3;
  ctx.strokeRect(pipe.x, -4, PIPE_W, topY + 4);

  // Top pipe cap
  ctx.fillStyle = pipeGradient(pipe.x - 7);
  ctx.fillRect(pipe.x - 7, topY - 22, PIPE_W + 14, 22);
  ctx.strokeStyle = '#1f3d0a';
  ctx.strokeRect(pipe.x - 7, topY - 22, PIPE_W + 14, 22);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(pipe.x + 10, 0, 8, topY - 24);

  // Bottom pipe
  ctx.fillStyle = pipeGradient(pipe.x);
  ctx.fillRect(pipe.x, botY + 10, PIPE_W, H - GROUND_H - botY);
  ctx.strokeStyle = '#1f3d0a';
  ctx.lineWidth = 3;
  ctx.strokeRect(pipe.x, botY, PIPE_W, H - GROUND_H - botY + 6);

  // Bottom pipe cap
  ctx.fillStyle = pipeGradient(pipe.x - 7);
  ctx.fillRect(pipe.x - 7, botY, PIPE_W + 14, 22);
  ctx.strokeStyle = '#1f3d0a';
  ctx.strokeRect(pipe.x - 7, botY, PIPE_W + 14, 22);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(pipe.x + 10, botY + 26, 8, H - GROUND_H - botY - 28);
}
function drawColorBird(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string, flap: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath();
  ctx.ellipse(0, 13, 17, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tail feathers
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-14, -4);
  ctx.lineTo(-26, -10);
  ctx.lineTo(-22, 0);
  ctx.lineTo(-26, 10);
  ctx.lineTo(-13, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Body
  ctx.fillStyle = color;
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Belly
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath();
  ctx.ellipse(-2, 6, 11, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wing
  ctx.save();
  ctx.rotate(Math.sin(flap / 4) * 0.35);
  ctx.fillStyle = shadeColor(color, -35);
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(-6, 4, 9, 6, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Eye
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(8, -6, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.arc(10, -6, 2.4, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = '#fbbf24';
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(16, -2);
  ctx.lineTo(29, 2);
  ctx.lineTo(16, 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(18, 3);
  ctx.lineTo(27, 3);
  ctx.stroke();
  ctx.restore();
}
function drawPhotoBird(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, img: HTMLImageElement, flap: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath();
  ctx.ellipse(0, 14, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tail
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-13, -4);
  ctx.lineTo(-26, -10);
  ctx.lineTo(-22, 0);
  ctx.lineTo(-26, 10);
  ctx.lineTo(-13, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Photo circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.clip();
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  ctx.drawImage(img, sx, sy, side, side, -18, -18, 36, 36);
  ctx.restore();
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.stroke();

  // Wing
  ctx.save();
  ctx.rotate(Math.sin(flap / 4) * 0.35);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(-7, 6, 9, 6, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Beak
  ctx.fillStyle = '#fbbf24';
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(15, -1);
  ctx.lineTo(29, 3);
  ctx.lineTo(15, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string, flap: number, photoImage: HTMLImageElement | null, birdStyle: BirdStyle) {
  if (birdStyle === 'photo' && photoImage && photoImage.complete) {
    drawPhotoBird(ctx, x, y, angle, photoImage, flap);
    return;
  }
  drawColorBird(ctx, x, y, angle, color, flap);
}
export default function FlappyPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photoImageRef = useRef<HTMLImageElement | null>(null);
  const stateRef = useRef<GameState>('idle');
  const birdYRef = useRef(H / 2);
  const birdVRef = useRef(0);
  const pipesRef = useRef<Pipe[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef(0);
  const pipeTimerRef = useRef(0);
  const bgOffsetRef = useRef(0);
  const rafRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [userColor, setUserColor] = useState('#1BDBDB');
  const [birdColor, setBirdColor] = useState('#f97316');
  const [userName, setUserName] = useState('');
  const [isNewBest, setIsNewBest] = useState(false);
  const [birdStyle, setBirdStyle] = useState<BirdStyle>('color');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const navigate = useNavigate();
  useEffect(() => {
    const u = getUser();
    if (!u) {
      navigate('/');
      return;
    }
    setUserColor(u.color ?? '#1BDBDB');
    setBirdColor(u.color ?? '#f97316');
    setUserName(u.name);
    setBestScore(u.gameHighScore ?? 0);
  }, [navigate]);
  useEffect(() => {
    if (!photoDataUrl) {
      photoImageRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      photoImageRef.current = img;
    };
    img.src = photoDataUrl;
  }, [photoDataUrl]);
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);
  const spawnPipe = useCallback(() => {
    const minTop = 58;
    const maxTop = H - GROUND_H - PIPE_GAP - 70;
    const topH = minTop + Math.random() * Math.max(30, maxTop - minTop);
    pipesRef.current.push({
      x: W + 18,
      topH,
      scored: false
    });
  }, []);
  const spawnParticles = useCallback((x: number, y: number) => {
    const colors = [birdColor, '#fbbf24', '#ef4444', '#ffffff', '#38bdf8'];
    for (let i = 0; i < 24; i += 1) {
      const angle = Math.PI * 2 * i / 24 + Math.random() * 0.45;
      const speed = 2 + Math.random() * 4.2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        r: 2 + Math.random() * 4
      });
    }
  }, [birdColor]);
  const checkCollision = useCallback((birdY: number, pipes: Pipe[]): boolean => {
    if (birdY - BIRD_R <= 0 || birdY + BIRD_R >= H - GROUND_H) return true;
    for (const pipe of pipes) {
      const birdLeft = BIRD_X - BIRD_R + 5;
      const birdRight = BIRD_X + BIRD_R - 5;
      const pipeLeft = pipe.x + 5;
      const pipeRight = pipe.x + PIPE_W - 5;
      if (birdRight > pipeLeft && birdLeft < pipeRight) {
        if (birdY - BIRD_R + 5 < pipe.topH || birdY + BIRD_R - 5 > pipe.topH + PIPE_GAP) {
          return true;
        }
      }
    }
    return false;
  }, []);
  const handleGameOver = useCallback((finalScore: number) => {
    const result = recordFlappyRun(finalScore);
    setIsNewBest(result.isNewBest);
    const u = getUser();
    if (u) {
      setBestScore(u.gameHighScore ?? 0);
    }
  }, []);
  const jump = useCallback(() => {
    if (stateRef.current === 'dead') return;
    if (stateRef.current === 'idle') {
      stateRef.current = 'playing';
      setGameState('playing');
    }
    birdVRef.current = JUMP;
  }, []);
  const reset = useCallback(() => {
    birdYRef.current = H / 2;
    birdVRef.current = 0;
    pipesRef.current = [];
    particlesRef.current = [];
    frameRef.current = 0;
    pipeTimerRef.current = 0;
    scoreRef.current = 0;
    setScore(0);
    setIsNewBest(false);
    stateRef.current = 'idle';
    setGameState('idle');
  }, []);
  async function startCamera() {
    setCameraError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera is not available in this browser.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user'
        },
        audio: false
      });
      streamRef.current = stream;
      setCameraOpen(true);
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {
            setCameraError('Could not start camera preview.');
          });
        }
      }, 50);
    } catch {
      setCameraError('Camera permission was denied or unavailable.');
    }
  }
  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  }
  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const size = 240;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const videoW = video.videoWidth || size;
    const videoH = video.videoHeight || size;
    const side = Math.min(videoW, videoH);
    const sx = (videoW - side) / 2;
    const sy = (videoH - side) / 2;

    // Mirror captured image so it matches the mirrored preview.
    ctx.save();
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
    ctx.restore();
    const dataUrl = canvas.toDataURL('image/png');
    setPhotoDataUrl(dataUrl);
    setBirdStyle('photo');
    stopCamera();
  }
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let lastTime = performance.now();
    function loop(now: number) {
      if (!ctx) return;
      const rawDt = (now - lastTime) / (1000 / 60);
      const dt = Math.min(1.6, Math.max(0.45, rawDt || 1));
      lastTime = now;
      const state = stateRef.current;
      if (state === 'playing') {
        birdVRef.current += GRAVITY * dt;
        birdVRef.current = Math.min(birdVRef.current, MAX_FALL_SPEED);
        birdYRef.current += birdVRef.current * dt;
        frameRef.current += dt;
        pipeTimerRef.current += dt;
        bgOffsetRef.current += PIPE_SPEED * dt;
        if (pipeTimerRef.current >= PIPE_INTERVAL) {
          spawnPipe();
          pipeTimerRef.current -= PIPE_INTERVAL;
        }
        pipesRef.current = pipesRef.current.filter(pipe => pipe.x + PIPE_W > -20);
        for (const pipe of pipesRef.current) {
          pipe.x -= PIPE_SPEED * dt;
          if (!pipe.scored && pipe.x + PIPE_W < BIRD_X) {
            pipe.scored = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
          }
        }
        particlesRef.current = particlesRef.current.filter(particle => particle.life > 0);
        for (const particle of particlesRef.current) {
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;
          particle.vy += 0.15 * dt;
          particle.life -= 0.04 * dt;
        }
        if (checkCollision(birdYRef.current, pipesRef.current)) {
          stateRef.current = 'dead';
          setGameState('dead');
          spawnParticles(BIRD_X, birdYRef.current);
          handleGameOver(scoreRef.current);
        }
      } else if (state === 'idle') {
        birdYRef.current = H / 2 + Math.sin(Date.now() / 380) * 8;
        bgOffsetRef.current += 0.55 * dt;
        frameRef.current += dt;
      } else if (state === 'dead') {
        bgOffsetRef.current += 0.15 * dt;
        particlesRef.current = particlesRef.current.filter(particle => particle.life > 0);
        for (const particle of particlesRef.current) {
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;
          particle.vy += 0.15 * dt;
          particle.life -= 0.04 * dt;
        }
      }
      drawBackground(ctx, bgOffsetRef.current);
      for (const pipe of pipesRef.current) {
        drawPipe(ctx, pipe);
      }
      if (state !== 'dead') {
        const angle = Math.min(Math.max(birdVRef.current * 0.055, -0.45), 0.95);
        drawBird(ctx, BIRD_X, birdYRef.current, angle, birdColor, frameRef.current, photoImageRef.current, birdStyle);
      }
      for (const particle of particlesRef.current) {
        ctx.save();
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (state === 'playing') {
        drawPixelText(ctx, String(scoreRef.current), W / 2, 58, 32, '#ffffff', '#111827');
      }
      if (state === 'idle') {
        drawPixelText(ctx, 'FLAPPY INTERN', W / 2, 78, 30, '#ffffff', '#111827');
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        roundRect(ctx, W / 2 - 110, H / 2 - 48, 220, 86, 12);
        ctx.fill();
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 3;
        roundRect(ctx, W / 2 - 110, H / 2 - 48, 220, 86, 12);
        ctx.stroke();
        ctx.fillStyle = '#111827';
        ctx.font = '900 16px "Space Grotesk", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Tap / Space to Start', W / 2, H / 2 - 16);
        ctx.fillStyle = '#475569';
        ctx.font = '13px Inter, Arial, sans-serif';
        ctx.fillText('Avoid the pipes!', W / 2, H / 2 + 8);
        ctx.textBaseline = 'alphabetic';
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [birdColor, birdStyle, spawnPipe, spawnParticles, checkCollision, handleGameOver]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jump]);

  // ─── Dead screen: result banner ───────────────────────────────────────────────

  function ResultBanner() {
    if (gameState !== 'dead') return null;
    if (isNewBest) {
      return <div className="mb-3 w-full rounded-xl px-4 py-2.5 text-center text-xs font-semibold" style={{
        background: 'rgba(251,191,36,0.22)',
        color: '#fbbf24',
        border: '1px solid rgba(251,191,36,0.5)'
      }}>
          <span className="inline-flex items-center justify-center gap-1.5">
            <Trophy size={14} aria-hidden="true" />
            New Personal Best! Score saved to leaderboard.
          </span>
        </div>;
    }
    return <div className="mb-3 w-full rounded-xl px-4 py-2.5 text-center text-xs font-semibold" style={{
      background: 'rgba(27,219,219,0.2)',
      color: '#0fa8a8',
      border: '1px solid rgba(27,219,219,0.4)'
    }}>
        Score saved.
      </div>;
  }
  return <AppLayout title="Flappy Bird">
      <Helmet>
        <title>Flappy Bird — Intern Break Space</title>
        <meta name="description" content="Play Flappy Bird and compete for the top score on the leaderboard." />
        <link rel="canonical" href="/flappy" />
      </Helmet>

      <div className="flex flex-col items-center justify-start gap-6 p-6">
        <h1 className="sr-only">Flappy Bird Game</h1>

        <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground">
          <Bird size={17} className="text-sky-600" aria-hidden="true" />
          Flappy Bird
        </div>

        {/* Top bar */}
        <div className="flex w-full max-w-[440px] items-center justify-between">
          <GameBackButton />

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Trophy size={13} style={{
              color: '#fbbf24'
            }} />
              <span>Best:</span>
              <span className="font-bold" style={{
              color: '#fbbf24'
            }}>
                {bestScore}
              </span>
            </div>
          </div>
        </div>

        {/* Bird customizer */}
        <AnimatePresence>
          {gameState === 'idle' && <motion.div key="customizer" initial={{
          opacity: 0,
          y: -8
        }} animate={{
          opacity: 1,
          y: 0
        }} exit={{
          opacity: 0,
          y: -8
        }} transition={{
          duration: 0.25
        }} className="w-full max-w-[400px] rounded-2xl border border-border bg-card p-4 shadow-lg">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-foreground">Customize your bird</p>
                  <p className="text-xs text-muted-foreground">
                    Pick a color or use a camera photo.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                                    {photoDataUrl && <button onClick={() => setBirdStyle('photo')} className={`h-11 w-11 overflow-hidden rounded-full border-2 ${birdStyle === 'photo' ? 'border-primary' : 'border-border'}`} title="Use photo bird">
                    <img src={photoDataUrl} alt="Your bird" className="h-full w-full object-cover" />
                  </button>}
                </div>
              </div>

                            <div className="flex flex-wrap items-center gap-2">
                {BIRD_COLORS.map(color => <button key={color} onClick={() => {
              setBirdColor(color);
              setBirdStyle('color');
            }} className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${birdStyle === 'color' && birdColor === color ? 'border-foreground' : 'border-white/50'}`} style={{
              background: color,
              boxShadow: birdStyle === 'color' && birdColor === color ? `0 0 0 3px ${color}55` : undefined
            }} aria-label={`Select ${color} bird`} />)}

                <button onClick={startCamera} className="ml-auto inline-flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted/70">
                  <Camera size={14} />
                  Take Photo
                </button>
              </div>

              {cameraError && <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {cameraError}
                </p>}
            </motion.div>}
        </AnimatePresence>

        {/* Canvas wrapper */}
        <div className="relative" style={{
        width: W,
        maxWidth: '100%'
      }}>
          <canvas ref={canvasRef} width={W} height={H} onClick={jump} className="cursor-pointer select-none rounded-2xl" style={{
          border: '3px solid rgba(15,23,42,0.75)',
          boxShadow: '0 0 40px rgba(27,219,219,0.15)',
          touchAction: 'none',
          display: 'block',
          width: '100%',
          height: 'auto',
          imageRendering: 'auto'
        }} onTouchStart={e => {
          e.preventDefault();
          jump();
        }} />

          {/* Death overlay */}
          <AnimatePresence>
            {gameState === 'dead' && <motion.div initial={{
            opacity: 0,
            scale: 0.9
          }} animate={{
            opacity: 1,
            scale: 1
          }} exit={{
            opacity: 0
          }} transition={{
            duration: 0.3
          }} className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl px-6" style={{
            background: 'rgba(15,15,26,0.82)',
            backdropFilter: 'blur(4px)'
          }}>
                <CircleAlert size={42} className="mb-3 text-destructive" aria-hidden="true" />

                <h2 className="mb-1 text-xl font-bold" style={{
              fontFamily: 'var(--font-heading)',
              color: '#ffffff'
            }}>
                  Game Over
                </h2>

                <p className="mb-4 text-sm" style={{
              color: 'rgba(255,255,255,0.65)'
            }}>
                  Score:{' '}
                  <span className="font-bold" style={{
                color: '#ffffff'
              }}>
                    {score}
                  </span>
                </p>

                <ResultBanner />

                <div className="flex items-center gap-3">
                  <button onClick={reset} className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-105" style={{
                background: 'linear-gradient(135deg, #1BDBDB, #0fa8a8)',
                color: '#0a1628'
              }}>
                    <RotateCcw size={14} />
                    Play Again
                  </button>

                  <button onClick={() => navigate('/games')} className="flex items-center gap-2 rounded-xl border border-border/40 px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
                    Back
                  </button>
                </div>
              </motion.div>}
          </AnimatePresence>
        </div>

        {/* Controls hint */}
        <p className="text-xs text-muted-foreground/60">Click · Tap · Space · ↑ to flap</p>

        {/* Player chip */}
        <div className="flex items-center gap-2 rounded-xl border border-border/30 px-3 py-2" style={{
        background: 'var(--surface-card)'
      }}>
          <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white" style={{
          background: birdStyle === 'photo' && photoDataUrl ? undefined : birdColor || userColor
        }}>
            {birdStyle === 'photo' && photoDataUrl ? <img src={photoDataUrl} alt="Bird" className="h-full w-full object-cover" /> : userName.charAt(0).toUpperCase()}
          </div>

          <span className="text-xs text-muted-foreground">{userName}</span>
          <span className="text-xs text-border/60">·</span>
          <span className="text-xs text-muted-foreground">
            Score: <span className="font-semibold text-foreground">{score}</span>
          </span>
        </div>
      </div>

      {/* Camera modal */}
      <AnimatePresence>
        {cameraOpen && <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur" initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }}>
            <motion.div className="w-full max-w-sm rounded-3xl border border-white/15 bg-slate-950 p-4 shadow-2xl" initial={{
          scale: 0.92,
          opacity: 0
        }} animate={{
          scale: 1,
          opacity: 1
        }} exit={{
          scale: 0.92,
          opacity: 0
        }}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">Take bird photo</p>
                  <p className="text-xs text-white/50">The camera preview is mirrored.</p>
                </div>

                <button onClick={stopCamera} className="rounded-full border border-white/15 bg-white/5 p-2 text-white transition hover:bg-white/10">
                  <X size={16} />
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/15 bg-black">
                <video ref={videoRef} className="aspect-square w-full object-cover" style={{
              transform: 'scaleX(-1)'
            }} playsInline muted />
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={stopCamera} className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                  Cancel
                </button>

                <button onClick={capturePhoto} className="flex-1 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:brightness-110">
                  Use Photo
                </button>
              </div>
            </motion.div>
          </motion.div>}
      </AnimatePresence>
    </AppLayout>;
}
