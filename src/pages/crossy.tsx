import { Helmet } from '@dr.pogodin/react-helmet';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from 'motion/react';
import AppLayout from '@/layouts/AppLayout';
import { getUser, recordCrossyScore } from '@/lib/ibs-store';
import { Trophy, RotateCcw } from 'lucide-react';
import GameBackButton from '@/components/GameBackButton';
const TILE = 48;
const COLS = 11;
const VISIBLE_ROWS = 13;
const W = TILE * COLS;
const H = TILE * VISIBLE_ROWS;
type LaneType = 'safe' | 'road' | 'water' | 'train';
type GameState = 'idle' | 'playing' | 'dead';
type AnimalType = 'bird' | 'cat' | 'narwhal';
interface Lane {
  type: LaneType;
  y: number;
  speed: number;
  vehicles: Vehicle[];
  logColor?: string;
}
interface Vehicle {
  x: number;
  w: number;
  color: string;
}
interface AnimalOption {
  label: string;
  value: string;
  swatch: string;
}
const CAR_COLORS = ['#f97316', '#ef4444', '#8b5cf6', '#22c55e', '#3b82f6', '#eab308'];
const LOG_COLORS = ['#7c2d12', '#92400e', '#78350f', '#a16207'];
const TRAIN_COLOR = '#dc2626';
const ANIMALS: Array<{
  id: AnimalType;
  label: string;
  emoji: string;
  description: string;
}> = [{
  id: 'bird',
  label: 'Bird',
  emoji: '🐔',
  description: 'Classic pixel hopper'
}, {
  id: 'cat',
  label: 'Cat',
  emoji: '🐱',
  description: 'Blocky street crosser'
}, {
  id: 'narwhal',
  label: 'Narwhal',
  emoji: '🦄',
  description: 'Pixel ocean traveler'
}];
const ANIMAL_OPTIONS: Record<AnimalType, AnimalOption[]> = {
  bird: [{
    label: 'White',
    value: '#ffffff',
    swatch: '#ffffff'
  }, {
    label: 'Orange',
    value: '#f97316',
    swatch: '#f97316'
  }, {
    label: 'Red',
    value: '#ef4444',
    swatch: '#ef4444'
  }, {
    label: 'Yellow',
    value: '#facc15',
    swatch: '#facc15'
  }, {
    label: 'Green',
    value: '#22c55e',
    swatch: '#22c55e'
  }, {
    label: 'Blue',
    value: '#3b82f6',
    swatch: '#3b82f6'
  }, {
    label: 'Purple',
    value: '#8b5cf6',
    swatch: '#8b5cf6'
  }, {
    label: 'Teal',
    value: '#1BDBDB',
    swatch: '#1BDBDB'
  }],
  cat: [{
    label: 'Orange Tabby',
    value: 'cat-orange',
    swatch: '#f97316'
  }, {
    label: 'Black',
    value: 'cat-black',
    swatch: '#111827'
  }, {
    label: 'Gray',
    value: 'cat-gray',
    swatch: '#94a3b8'
  }, {
    label: 'White',
    value: 'cat-white',
    swatch: '#f8fafc'
  }, {
    label: 'Calico',
    value: 'cat-calico',
    swatch: '#f59e0b'
  }, {
    label: 'Tuxedo',
    value: 'cat-tuxedo',
    swatch: '#1f2937'
  }],
  narwhal: [{
    label: 'Ocean Blue',
    value: '#38bdf8',
    swatch: '#38bdf8'
  }, {
    label: 'Deep Blue',
    value: '#2563eb',
    swatch: '#2563eb'
  }, {
    label: 'Blue Gray',
    value: '#64748b',
    swatch: '#64748b'
  }, {
    label: 'Lavender',
    value: '#a78bfa',
    swatch: '#a78bfa'
  }, {
    label: 'Purple',
    value: '#8b5cf6',
    swatch: '#8b5cf6'
  }, {
    label: 'Ice Blue',
    value: '#bae6fd',
    swatch: '#bae6fd'
  }, {
    label: 'Indigo',
    value: '#4f46e5',
    swatch: '#4f46e5'
  }, {
    label: 'Aqua',
    value: '#22d3ee',
    swatch: '#22d3ee'
  }]
};
function rand(seed: number) {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}
function generateLanes(count: number): Lane[] {
  const lanes: Lane[] = [];
  lanes.push({
    type: 'safe',
    y: 0,
    speed: 0,
    vehicles: []
  });
  lanes.push({
    type: 'safe',
    y: 1,
    speed: 0,
    vehicles: []
  });
  for (let i = 2; i < count; i++) {
    const previousThree = lanes.slice(-3);
    const roadStreak = previousThree.filter(lane => lane.type === 'road').length;
    const waterStreak = previousThree.filter(lane => lane.type === 'water').length;
    let type: LaneType;
    const r = Math.random();
    if (i % 8 === 0) {
      type = 'safe';
    } else if (waterStreak >= 3) {
      type = r < 0.7 ? 'road' : 'safe';
    } else if (roadStreak >= 3) {
      type = r < 0.65 ? 'water' : 'safe';
    } else if (r < 0.42) {
      type = 'road';
    } else if (r < 0.68) {
      type = 'water';
    } else if (r < 0.76) {
      type = 'train';
    } else {
      type = 'safe';
    }
    const dir = Math.random() < 0.5 ? 1 : -1;
    const baseSpeed = type === 'train' ? 3.8 + Math.random() * 2.4 : type === 'road' ? 1.05 + Math.random() * 1.25 : type === 'water' ? 0.75 + Math.random() * 0.95 : 0;
    lanes.push({
      type,
      y: i,
      speed: dir * baseSpeed,
      vehicles: [],
      logColor: LOG_COLORS[Math.floor(Math.random() * LOG_COLORS.length)]
    });
  }
  return lanes;
}
function spawnVehicles(lane: Lane): Vehicle[] {
  const vehicles: Vehicle[] = [];
  if (lane.type === 'road') {
    const count = 1 + Math.floor(Math.random() * 3);
    const spacing = W / count;
    for (let i = 0; i < count; i += 1) {
      const w = 58 + Math.floor(Math.random() * 18);
      vehicles.push({
        x: i * spacing + Math.random() * Math.max(1, spacing - w),
        w,
        color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]
      });
    }
  }
  if (lane.type === 'water') {
    const count = 2 + Math.floor(Math.random() * 2);
    const spacing = W / count;
    for (let i = 0; i < count; i += 1) {
      const w = 110 + Math.floor(Math.random() * 62);
      vehicles.push({
        x: i * spacing + Math.random() * 24,
        w,
        color: lane.logColor ?? '#92400e'
      });
    }
  }
  if (lane.type === 'train') {
    vehicles.push({
      x: lane.speed > 0 ? -420 : W + 420,
      w: 330,
      color: TRAIN_COLOR
    });
  }
  return vehicles;
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
function shadeHex(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (n >> 16) + amt));
  const g = Math.min(255, Math.max(0, (n >> 8 & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (n & 0xff) + amt));
  return `rgb(${r},${g},${b})`;
}
function drawTile(ctx: CanvasRenderingContext2D, x: number, y: number, type: LaneType, col: number) {
  if (type === 'safe') {
    ctx.fillStyle = col % 2 === 0 ? '#9be53d' : '#8fd735';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(x, y, TILE, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(x, y + TILE - 5, TILE, 5);
  }
  if (type === 'road') {
    ctx.fillStyle = col % 2 === 0 ? '#3f4650' : '#37404a';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(x, y, TILE, 4);
  }
  if (type === 'water') {
    ctx.fillStyle = col % 2 === 0 ? '#67e8f9' : '#5eead4';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x, y, TILE, 5);
  }
  if (type === 'train') {
    ctx.fillStyle = col % 2 === 0 ? '#7c736b' : '#8b8178';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.fillRect(x, y + TILE - 5, TILE, 5);
  }
}
function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number) {
  const height = 28 + rand(seed) * 10;
  const trunkX = x + TILE / 2 - 5;
  const trunkY = y + TILE - 16;
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(x + 13, y + TILE - 10, 28, 8);
  ctx.fillStyle = '#6b3f21';
  ctx.fillRect(trunkX, trunkY, 10, 14);
  ctx.fillStyle = '#84cc16';
  ctx.fillRect(x + 12, y + 10, 28, height);
  ctx.fillStyle = '#a3e635';
  ctx.fillRect(x + 12, y + 8, 28, 8);
  ctx.fillStyle = '#65a30d';
  ctx.fillRect(x + 32, y + 14, 8, height - 4);
}
function drawBush(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(x + 12, y + 34, 24, 7);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(x + 12, y + 22, 24, 18);
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(x + 12, y + 19, 24, 6);
}
function drawRoadMarkings(ctx: CanvasRenderingContext2D, y: number, time: number) {
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  const offset = time / 26 % 96;
  for (let x = -96 + offset; x < W + 96; x += 96) {
    ctx.fillRect(x, y + TILE / 2 - 2, 42, 4);
  }
}
function drawWaterDetails(ctx: CanvasRenderingContext2D, y: number, time: number) {
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  const offset = time / 22 % 120;
  for (let x = -120 + offset; x < W + 120; x += 120) {
    ctx.fillRect(x, y + 10, 28, 7);
    ctx.fillRect(x + 36, y + 16, 18, 5);
    ctx.fillRect(x + 76, y + 34, 34, 6);
  }
}
function drawTrainTracks(ctx: CanvasRenderingContext2D, y: number) {
  ctx.strokeStyle = '#d6d3d1';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, y + 16);
  ctx.lineTo(W, y + 16);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, y + 33);
  ctx.lineTo(W, y + 33);
  ctx.stroke();
  ctx.fillStyle = '#57534e';
  for (let x = 0; x < W; x += 28) {
    ctx.fillRect(x, y + 12, 16, 26);
  }
}
function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string, dir: number) {
  const carY = y + 10;
  const bodyH = 27;
  const frontX = dir > 0 ? x + w - 16 : x;
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  roundRect(ctx, x + 5, carY + 24, w - 4, 9, 5);
  ctx.fill();
  ctx.fillStyle = shadeHex(color, -35);
  roundRect(ctx, x, carY + 7, w, bodyH, 5);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(ctx, x + 3, carY, w - 6, bodyH, 5);
  ctx.fill();
  ctx.fillStyle = '#f8fafc';
  roundRect(ctx, x + w * 0.32, carY - 7, w * 0.42, 20, 4);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x + w * 0.38, carY - 3, w * 0.11, 9);
  ctx.fillRect(x + w * 0.58, carY - 3, w * 0.11, 9);
  ctx.fillStyle = '#111827';
  ctx.fillRect(x + 9, carY + bodyH - 3, 13, 7);
  ctx.fillRect(x + w - 22, carY + bodyH - 3, 13, 7);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(dir > 0 ? x + w - 4 : x, carY + 9, 4, 7);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(dir > 0 ? x : x + w - 4, carY + 10, 4, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(frontX + 4, carY + 3, 10, 3);
}
function drawLog(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string) {
  const logY = y + 9;
  const h = TILE - 16;
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  roundRect(ctx, x + 8, logY + h - 2, w - 2, 8, 5);
  ctx.fill();
  ctx.fillStyle = shadeHex(color, -35);
  roundRect(ctx, x, logY + 5, w, h, 8);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(ctx, x, logY, w, h, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x + 10, logY + 5, w - 20, 5);
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 5; i += 1) {
    const lx = x + w / 5 * i;
    ctx.beginPath();
    ctx.moveTo(lx, logY + 5);
    ctx.lineTo(lx - 5, logY + h - 5);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x + 16, logY + 17, 28, 4);
  ctx.fillRect(x + w - 54, logY + 12, 30, 4);
}
function drawTrain(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  const trainY = y + 5;
  const h = TILE - 10;
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  roundRect(ctx, x + 10, trainY + h - 2, w, 10, 4);
  ctx.fill();
  ctx.fillStyle = '#991b1b';
  roundRect(ctx, x, trainY + 5, w, h, 4);
  ctx.fill();
  ctx.fillStyle = TRAIN_COLOR;
  roundRect(ctx, x, trainY, w, h, 4);
  ctx.fill();
  ctx.fillStyle = '#fef3c7';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillRect(x + 24 + i * 58, trainY + 9, 32, 16);
  }
  ctx.fillStyle = '#111827';
  for (let i = 0; i < 6; i += 1) {
    ctx.beginPath();
    ctx.arc(x + 22 + i * 52, trainY + h + 1, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}
function getCatPalette(skin: string) {
  if (skin === 'cat-black') {
    return {
      primary: '#111827',
      secondary: '#374151',
      face: '#1f2937',
      chest: '#111827',
      patch: '#f8fafc',
      nose: '#f472b6',
      eye: '#fde047',
      pattern: 'solid'
    };
  }
  if (skin === 'cat-gray') {
    return {
      primary: '#94a3b8',
      secondary: '#64748b',
      face: '#cbd5e1',
      chest: '#e2e8f0',
      patch: '#e2e8f0',
      nose: '#f472b6',
      eye: '#22c55e',
      pattern: 'stripes'
    };
  }
  if (skin === 'cat-white') {
    return {
      primary: '#f8fafc',
      secondary: '#cbd5e1',
      face: '#ffffff',
      chest: '#e2e8f0',
      patch: '#e2e8f0',
      nose: '#f472b6',
      eye: '#38bdf8',
      pattern: 'solid'
    };
  }
  if (skin === 'cat-calico') {
    return {
      primary: '#f8fafc',
      secondary: '#f97316',
      face: '#ffffff',
      chest: '#f8fafc',
      patch: '#111827',
      nose: '#f472b6',
      eye: '#22c55e',
      pattern: 'calico'
    };
  }
  if (skin === 'cat-tuxedo') {
    return {
      primary: '#111827',
      secondary: '#374151',
      face: '#111827',
      chest: '#f8fafc',
      patch: '#f8fafc',
      nose: '#f472b6',
      eye: '#facc15',
      pattern: 'tuxedo'
    };
  }
  return {
    primary: '#f97316',
    secondary: '#c2410c',
    face: '#fb923c',
    chest: '#fed7aa',
    patch: '#fed7aa',
    nose: '#f472b6',
    eye: '#111827',
    pattern: 'stripes'
  };
}
function getAnimalChipColor(animalType: AnimalType, skin: string) {
  if (animalType === 'cat') {
    return getCatPalette(skin).primary;
  }
  return skin;
}
function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, facing: number) {
  ctx.save();
  ctx.translate(x + TILE / 2, y + TILE / 2);
  if (facing < 0) ctx.scale(-1, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(-16, 16, 33, 7);
  ctx.fillStyle = '#111827';
  ctx.fillRect(-14, -7, 28, 27);
  ctx.fillRect(2, -20, 20, 20);
  ctx.fillStyle = shadeHex(color, -30);
  ctx.fillRect(-10, -1, 22, 22);
  ctx.fillStyle = color;
  ctx.fillRect(-12, -5, 24, 22);
  ctx.fillStyle = color;
  ctx.fillRect(4, -18, 16, 16);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(12, -14, 5, 5);
  ctx.fillStyle = '#111827';
  ctx.fillRect(14, -13, 2, 2);
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(20, -10);
  ctx.lineTo(28, -7);
  ctx.lineTo(20, -4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(8, -24, 5, 7);
  ctx.fillRect(13, -26, 5, 8);
  ctx.fillStyle = color === '#ffffff' ? '#e5e7eb' : shadeHex(color, -45);
  ctx.fillRect(-15, 0, 9, 15);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-6, 17);
  ctx.lineTo(-6, 25);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(5, 17);
  ctx.lineTo(5, 25);
  ctx.stroke();
  ctx.restore();
}
function drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, skin: string, facing: number) {
  const palette = getCatPalette(skin);
  ctx.save();
  ctx.translate(x + TILE / 2, y + TILE / 2);
  if (facing < 0) ctx.scale(-1, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(-16, 17, 34, 7);
  ctx.fillStyle = '#111827';
  ctx.fillRect(-22, -11, 7, 22);
  ctx.fillRect(-27, -16, 12, 7);
  ctx.fillStyle = palette.secondary;
  ctx.fillRect(-20, -9, 4, 18);
  ctx.fillRect(-25, -14, 9, 4);
  ctx.fillStyle = '#111827';
  ctx.fillRect(-15, -2, 29, 24);
  ctx.fillStyle = palette.primary;
  ctx.fillRect(-12, 0, 24, 19);
  ctx.fillStyle = palette.chest;
  ctx.fillRect(-4, 7, 9, 12);
  ctx.fillStyle = '#111827';
  ctx.fillRect(-10, -19, 26, 22);
  ctx.fillRect(-12, -25, 8, 8);
  ctx.fillRect(9, -25, 8, 8);
  ctx.fillStyle = palette.face;
  ctx.fillRect(-8, -17, 22, 18);
  ctx.fillStyle = palette.face;
  ctx.fillRect(-10, -23, 6, 7);
  ctx.fillRect(10, -23, 6, 7);
  ctx.fillStyle = '#f9a8d4';
  ctx.fillRect(-8, -20, 3, 3);
  ctx.fillRect(12, -20, 3, 3);
  if (palette.pattern === 'stripes') {
    ctx.fillStyle = palette.secondary;
    ctx.fillRect(-5, -17, 3, 6);
    ctx.fillRect(1, -17, 3, 7);
    ctx.fillRect(7, -17, 3, 6);
    ctx.fillRect(-10, 3, 4, 3);
    ctx.fillRect(7, 4, 5, 3);
  }
  if (palette.pattern === 'calico') {
    ctx.fillStyle = palette.secondary;
    ctx.fillRect(-8, -17, 9, 9);
    ctx.fillRect(-11, 4, 8, 8);
    ctx.fillStyle = palette.patch;
    ctx.fillRect(7, -12, 7, 8);
    ctx.fillRect(5, 7, 7, 7);
  }
  if (palette.pattern === 'tuxedo') {
    ctx.fillStyle = palette.patch;
    ctx.fillRect(0, -8, 7, 7);
    ctx.fillRect(-3, 7, 10, 12);
  }
  if (palette.pattern === 'solid') {
    ctx.fillStyle = palette.face;
    ctx.fillRect(-8, -17, 22, 18);
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-4, -11, 5, 5);
  ctx.fillRect(7, -11, 5, 5);
  ctx.fillStyle = palette.eye;
  ctx.fillRect(-2, -10, 2, 2);
  ctx.fillRect(9, -10, 2, 2);
  ctx.fillStyle = palette.nose;
  ctx.fillRect(3, -5, 4, 3);
  ctx.fillStyle = '#111827';
  ctx.fillRect(4, -2, 2, 2);
  ctx.fillRect(1, 0, 3, 2);
  ctx.fillRect(6, 0, 3, 2);
  ctx.fillStyle = '#111827';
  ctx.fillRect(-12, -4, 8, 1);
  ctx.fillRect(-12, -1, 8, 1);
  ctx.fillRect(11, -4, 8, 1);
  ctx.fillRect(11, -1, 8, 1);
  ctx.fillStyle = palette.patch;
  ctx.fillRect(-10, 18, 7, 4);
  ctx.fillRect(5, 18, 7, 4);
  ctx.fillStyle = '#111827';
  ctx.fillRect(-11, 21, 8, 3);
  ctx.fillRect(5, 21, 8, 3);
  ctx.restore();
}
function drawNarwhal(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, facing: number) {
  ctx.save();
  ctx.translate(x + TILE / 2, y + TILE / 2);
  if (facing < 0) ctx.scale(-1, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(-18, 17, 36, 7);
  ctx.fillStyle = '#111827';
  ctx.fillRect(-27, -8, 12, 9);
  ctx.fillRect(-27, 5, 12, 9);
  ctx.fillRect(-20, -3, 8, 14);
  ctx.fillStyle = shadeHex(color, -35);
  ctx.fillRect(-25, -6, 9, 6);
  ctx.fillRect(-25, 7, 9, 6);
  ctx.fillRect(-18, -1, 6, 10);
  ctx.fillStyle = '#111827';
  ctx.fillRect(-17, -12, 34, 27);
  ctx.fillRect(12, -7, 8, 17);
  ctx.fillStyle = color;
  ctx.fillRect(-15, -10, 30, 23);
  ctx.fillRect(12, -5, 6, 13);
  ctx.fillStyle = 'rgba(255,255,255,0.58)';
  ctx.fillRect(-9, 5, 18, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(-9, -7, 14, 3);
  ctx.fillRect(7, -5, 5, 3);
  ctx.fillStyle = '#111827';
  ctx.fillRect(-6, 12, 12, 8);
  ctx.fillStyle = shadeHex(color, -40);
  ctx.fillRect(-4, 12, 8, 6);
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.moveTo(13, -10);
  ctx.lineTo(31, -25);
  ctx.lineTo(22, -5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(16, -10);
  ctx.lineTo(29, -22);
  ctx.lineTo(22, -6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#a78bfa';
  ctx.fillRect(22, -17, 3, 3);
  ctx.fillRect(19, -11, 3, 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(7, -5, 6, 6);
  ctx.fillStyle = '#111827';
  ctx.fillRect(10, -3, 2, 2);
  ctx.fillStyle = '#111827';
  ctx.fillRect(8, 5, 6, 2);
  ctx.fillRect(12, 3, 2, 2);
  ctx.restore();
}
function drawPlayerAnimal(ctx: CanvasRenderingContext2D, x: number, y: number, animalType: AnimalType, animalSkin: string, facing: number) {
  if (animalType === 'cat') {
    drawCat(ctx, x, y, animalSkin, facing);
    return;
  }
  if (animalType === 'narwhal') {
    drawNarwhal(ctx, x, y, animalSkin, facing);
    return;
  }
  drawBird(ctx, x, y, animalSkin, facing);
}
export default function CrossyPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const stateRef = useRef<GameState>('idle');
  const playerRowRef = useRef(0);
  const playerColRef = useRef(Math.floor(COLS / 2));
  const playerXRef = useRef(0);
  const playerYRef = useRef(0);
  const targetXRef = useRef(0);
  const targetYRef = useRef(0);
  const cameraRowRef = useRef(0);
  const lanesRef = useRef<Lane[]>([]);
  const scoreRef = useRef(0);
  const maxRowRef = useRef(0);
  const rafRef = useRef(0);
  const movingRef = useRef(false);
  const facingRef = useRef(1);
  const deathReasonRef = useRef('Squashed!');
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [userName, setUserName] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const [animalType, setAnimalType] = useState<AnimalType>('bird');
  const [animalSkin, setAnimalSkin] = useState('#ffffff');
  useEffect(() => {
    const u = getUser();
    if (!u) {
      navigate('/profile');
      return;
    }
    setUserName(u.name);
    const savedType = localStorage.getItem('ibs-crossy-animal') as AnimalType | null;
    const savedSkin = localStorage.getItem('ibs-crossy-skin');
    if (savedType && ANIMAL_OPTIONS[savedType]) {
      setAnimalType(savedType);
      if (savedSkin && ANIMAL_OPTIONS[savedType].some(o => o.value === savedSkin)) {
        setAnimalSkin(savedSkin);
      }
    } else if (u.color) {
      setAnimalSkin(u.color);
    }
    const saved = parseInt(localStorage.getItem('ibs-crossy-best') ?? '0', 10);
    setBestScore(saved);
  }, [navigate]);
  useEffect(() => {
    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas) return;
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    const bg = ctx.createLinearGradient(0, 0, 0, previewCanvas.height);
    bg.addColorStop(0, '#172033');
    bg.addColorStop(1, '#0f172a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    ctx.fillStyle = 'rgba(27,219,219,0.12)';
    ctx.fillRect(0, previewCanvas.height - 30, previewCanvas.width, 30);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let x = 0; x < previewCanvas.width; x += 12) {
      ctx.fillRect(x, previewCanvas.height - 30, 6, 30);
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    drawPlayerAnimal(ctx, 24, 24, animalType, animalSkin, 1);
    ctx.restore();
    ctx.strokeStyle = 'rgba(27,219,219,0.35)';
    ctx.lineWidth = 2;
    roundRect(ctx, 4, 4, previewCanvas.width - 8, previewCanvas.height - 8, 14);
    ctx.stroke();
  }, [animalType, animalSkin]);
  function worldToCanvas(row: number, col: number, camRow: number) {
    const screenRow = row - camRow;
    const x = col * TILE;
    const y = H - (screenRow + 1) * TILE;
    return {
      x,
      y
    };
  }
  const initGame = useCallback(() => {
    const TOTAL_LANES = 220;
    const lanes = generateLanes(TOTAL_LANES);
    for (const lane of lanes) {
      lane.vehicles = spawnVehicles(lane);
    }
    lanesRef.current = lanes;
    playerRowRef.current = 0;
    playerColRef.current = Math.floor(COLS / 2);
    cameraRowRef.current = 0;
    scoreRef.current = 0;
    maxRowRef.current = 0;
    movingRef.current = false;
    facingRef.current = 1;
    deathReasonRef.current = 'Squashed!';
    const {
      x,
      y
    } = worldToCanvas(0, Math.floor(COLS / 2), 0);
    playerXRef.current = x;
    playerYRef.current = y;
    targetXRef.current = x;
    targetYRef.current = y;
    setScore(0);
    stateRef.current = 'idle';
    setGameState('idle');
  }, []);
  const die = useCallback((reason = 'Squashed!') => {
    if (stateRef.current === 'dead') return;
    deathReasonRef.current = reason;
    stateRef.current = 'dead';
    setGameState('dead');
    const final = scoreRef.current;
    const previousBest = parseInt(localStorage.getItem('ibs-crossy-best') ?? '0', 10);
    if (final > previousBest) {
      localStorage.setItem('ibs-crossy-best', String(final));
      setBestScore(final);
    }
    // Also persist to room leaderboard
    recordCrossyScore(final);
  }, []);
  const move = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    if (stateRef.current === 'dead') return;
    if (movingRef.current) return;
    if (stateRef.current === 'idle') {
      stateRef.current = 'playing';
      setGameState('playing');
    }
    let newRow = playerRowRef.current;
    let newCol = playerColRef.current;
    if (dir === 'up') newRow += 1;
    if (dir === 'down') newRow = Math.max(0, newRow - 1);
    if (dir === 'left') {
      newCol = Math.max(0, newCol - 1);
      facingRef.current = -1;
    }
    if (dir === 'right') {
      newCol = Math.min(COLS - 1, newCol + 1);
      facingRef.current = 1;
    }
    if (newRow < 0) return;
    playerRowRef.current = newRow;
    playerColRef.current = newCol;
    if (newRow > maxRowRef.current) {
      maxRowRef.current = newRow;
      scoreRef.current = newRow;
      setScore(newRow);
    }
    const screenRow = newRow - cameraRowRef.current;
    if (screenRow >= VISIBLE_ROWS - 4) {
      cameraRowRef.current = newRow - (VISIBLE_ROWS - 5);
    }
    const {
      x,
      y
    } = worldToCanvas(newRow, newCol, cameraRowRef.current);
    targetXRef.current = x;
    targetYRef.current = y;
    movingRef.current = true;
  }, []);
  function selectAnimal(nextAnimalType: AnimalType) {
    setAnimalType(nextAnimalType);
    localStorage.setItem('ibs-crossy-animal', nextAnimalType);
    const options = ANIMAL_OPTIONS[nextAnimalType];
    const hasCurrentSkin = options.some(option => option.value === animalSkin);
    if (!hasCurrentSkin) {
      setAnimalSkin(options[0].value);
      localStorage.setItem('ibs-crossy-skin', options[0].value);
    }
  }
  function selectSkin(value: string) {
    setAnimalSkin(value);
    localStorage.setItem('ibs-crossy-skin', value);
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', ' '].includes(event.key)) {
        event.preventDefault();
      }
      if (event.key === 'ArrowUp' || event.key === 'w') move('up');
      if (event.key === 'ArrowDown' || event.key === 's') move('down');
      if (event.key === 'ArrowLeft' || event.key === 'a') move('left');
      if (event.key === 'ArrowRight' || event.key === 'd') move('right');
      if (event.key === ' ' && stateRef.current === 'idle') move('up');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    initGame();
    const TARGET_FPS = 60;
    const FRAME_MS = 1000 / TARGET_FPS;
    let lastTime = 0;
    function loop(now: number) {
      if (!ctx) return;
      const elapsed = now - lastTime;
      if (elapsed < FRAME_MS - 1) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      lastTime = now - elapsed % FRAME_MS;
      const state = stateRef.current;
      const lanes = lanesRef.current;
      const camRow = cameraRowRef.current;
      if (state === 'playing') {
        for (const lane of lanes) {
          if (lane.type === 'road' || lane.type === 'water' || lane.type === 'train') {
            for (const vehicle of lane.vehicles) {
              vehicle.x += lane.speed;
              if (lane.speed > 0 && vehicle.x > W + 20) {
                vehicle.x = -vehicle.w - 20;
              }
              if (lane.speed < 0 && vehicle.x + vehicle.w < -20) {
                vehicle.x = W + 20;
              }
            }
          }
        }
        const LERP = 0.32;
        playerXRef.current += (targetXRef.current - playerXRef.current) * LERP;
        playerYRef.current += (targetYRef.current - playerYRef.current) * LERP;
        const dx = Math.abs(playerXRef.current - targetXRef.current);
        const dy = Math.abs(playerYRef.current - targetYRef.current);
        if (dx < 0.9 && dy < 0.9) {
          playerXRef.current = targetXRef.current;
          playerYRef.current = targetYRef.current;
          movingRef.current = false;
        }
        const row = playerRowRef.current;
        const lane = lanes[row];
        if (!lane) {
          die('Lost!');
          return;
        }
        const playerCenterX = playerXRef.current + TILE / 2;
        const playerLeft = playerXRef.current + 11;
        const playerRight = playerXRef.current + TILE - 11;
        if (!movingRef.current && (lane.type === 'road' || lane.type === 'train')) {
          for (const vehicle of lane.vehicles) {
            const vehicleLeft = vehicle.x + 6;
            const vehicleRight = vehicle.x + vehicle.w - 6;
            if (playerRight > vehicleLeft && playerLeft < vehicleRight) {
              die(lane.type === 'train' ? 'Flattened by the train!' : 'Squashed!');
              return;
            }
          }
        }
        if (!movingRef.current && lane.type === 'water') {
          let onLog = false;
          let matchedLog: Vehicle | null = null;
          for (const log of lane.vehicles) {
            if (playerCenterX > log.x + 8 && playerCenterX < log.x + log.w - 8) {
              onLog = true;
              matchedLog = log;
              break;
            }
          }
          if (!onLog || !matchedLog) {
            die('Splashed!');
            return;
          }
          playerXRef.current += lane.speed;
          targetXRef.current = playerXRef.current;
          if (playerXRef.current < -TILE * 0.6 || playerXRef.current > W - TILE * 0.4) {
            die('Washed away!');
            return;
          }
          playerColRef.current = Math.min(COLS - 1, Math.max(0, Math.round(playerXRef.current / TILE)));
        }
      }
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(0, 0, W, H);
      for (let screenRow = 0; screenRow < VISIBLE_ROWS + 1; screenRow += 1) {
        const worldRow = camRow + screenRow;
        const lane = lanes[worldRow];
        if (!lane) continue;
        const canvasY = H - (screenRow + 1) * TILE;
        for (let col = 0; col < COLS; col += 1) {
          drawTile(ctx, col * TILE, canvasY, lane.type, col);
        }
        if (lane.type === 'road') {
          drawRoadMarkings(ctx, canvasY, now);
        }
        if (lane.type === 'water') {
          drawWaterDetails(ctx, canvasY, now);
        }
        if (lane.type === 'train') {
          drawTrainTracks(ctx, canvasY);
        }
        for (const vehicle of lane.vehicles) {
          if (lane.type === 'road') {
            drawCar(ctx, vehicle.x, canvasY, vehicle.w, vehicle.color, lane.speed);
          }
          if (lane.type === 'water') {
            drawLog(ctx, vehicle.x, canvasY, vehicle.w, vehicle.color);
          }
          if (lane.type === 'train') {
            drawTrain(ctx, vehicle.x, canvasY, vehicle.w);
          }
        }
        if (lane.type === 'safe') {
          for (let col = 0; col < COLS; col += 1) {
            const r = rand(worldRow * 77 + col * 19);
            if (worldRow <= 1 && col === Math.floor(COLS / 2)) continue;
            if (r > 0.82) {
              drawTree(ctx, col * TILE, canvasY, worldRow * 101 + col);
            } else if (r > 0.72) {
              drawBush(ctx, col * TILE, canvasY);
            }
          }
        }
      }
      if (state !== 'dead') {
        drawPlayerAnimal(ctx, playerXRef.current, playerYRef.current, animalType, animalSkin, facingRef.current);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(ctx, 10, 10, 78, 44, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 30px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(scoreRef.current), 49, 32);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(ctx, W - 110, 10, 100, 44, 8);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.font = '900 24px "Space Grotesk", sans-serif';
      ctx.fillText(String(bestScore), W - 60, 33);
      if (state === 'idle') {
        ctx.fillStyle = 'rgba(15,23,42,0.72)';
        roundRect(ctx, W / 2 - 130, H / 2 - 54, 260, 104, 18);
        ctx.fill();
        ctx.strokeStyle = 'rgba(27,219,219,0.65)';
        ctx.lineWidth = 2;
        roundRect(ctx, W / 2 - 130, H / 2 - 54, 260, 104, 18);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 17px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Arrow Keys / WASD', W / 2, H / 2 - 18);
        ctx.fillStyle = 'rgba(255,255,255,0.68)';
        ctx.font = '13px Inter, sans-serif';
        ctx.fillText('Hop forward, ride logs, avoid cars.', W / 2, H / 2 + 6);
        ctx.fillText('Press Space or move to start.', W / 2, H / 2 + 28);
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animalType, animalSkin, initGame, die, resetKey, bestScore]);
  function handleReset() {
    cancelAnimationFrame(rafRef.current);
    setResetKey(key => key + 1);
  }
  const currentAnimal = ANIMALS.find(animal => animal.id === animalType);
  const currentOptions = ANIMAL_OPTIONS[animalType];
  const chipColor = getAnimalChipColor(animalType, animalSkin);
  const DPad = () => <div className="grid w-32 grid-cols-3 gap-1">
      <div />

      <button onPointerDown={() => move('up')} className="flex h-10 select-none items-center justify-center rounded-lg text-lg font-bold transition-transform active:scale-95" style={{
      background: 'rgba(27,219,219,0.2)',
      color: '#1BDBDB',
      border: '1px solid rgba(27,219,219,0.4)'
    }}>
        ▲
      </button>

      <div />

      <button onPointerDown={() => move('left')} className="flex h-10 select-none items-center justify-center rounded-lg text-lg font-bold transition-transform active:scale-95" style={{
      background: 'rgba(27,219,219,0.2)',
      color: '#1BDBDB',
      border: '1px solid rgba(27,219,219,0.4)'
    }}>
        ◀
      </button>

      <button onPointerDown={() => move('down')} className="flex h-10 select-none items-center justify-center rounded-lg text-lg font-bold transition-transform active:scale-95" style={{
      background: 'rgba(27,219,219,0.2)',
      color: '#1BDBDB',
      border: '1px solid rgba(27,219,219,0.4)'
    }}>
        ▼
      </button>

      <button onPointerDown={() => move('right')} className="flex h-10 select-none items-center justify-center rounded-lg text-lg font-bold transition-transform active:scale-95" style={{
      background: 'rgba(27,219,219,0.2)',
      color: '#1BDBDB',
      border: '1px solid rgba(27,219,219,0.4)'
    }}>
        ▶
      </button>
    </div>;
  return <AppLayout title="Crossy Road">
      <Helmet>
        <title>Crossy Road — Intern Break Space</title>
        <meta name="description" content="Cross the road, dodge traffic, and keep hopping in this Crossy Road-style game." />
        <link rel="canonical" href="/crossy" />
      </Helmet>

      <div className="flex flex-col items-center justify-start gap-5 p-6">
        <h1 className="sr-only">Crossy Road Game</h1>

        <div className="flex w-full max-w-[540px] items-center justify-between">
          <GameBackButton />

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

        <AnimatePresence>
          {gameState === 'idle' && <motion.div key="crossy-customizer" initial={{
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
        }} className="w-full max-w-[540px] rounded-2xl border border-border bg-card p-4 shadow-lg">
              <div className="mb-4 grid gap-4 sm:grid-cols-[1fr_120px]">
                <div>
                  <p className="text-sm font-bold text-foreground">Choose your crosser</p>
                  <p className="text-xs text-muted-foreground">
                    Pick a pixel bird, cat, or narwhal. Each character stays close to the same
                    gameplay size.
                  </p>
                </div>

                <div className="flex flex-col items-center gap-2">
                  <canvas ref={previewCanvasRef} width={96} height={96} className="h-24 w-24 rounded-2xl border border-primary/25 bg-slate-950" style={{
                imageRendering: 'pixelated',
                boxShadow: '0 0 24px rgba(27,219,219,0.12)'
              }} aria-label="Character preview" />
                  <p className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    Preview
                  </p>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-2">
                {ANIMALS.map(animal => <button key={animal.id} onClick={() => selectAnimal(animal.id)} className={`rounded-2xl border px-3 py-3 text-center transition hover:scale-[1.02] ${animalType === animal.id ? 'border-primary bg-primary/10' : 'border-border bg-muted/40 hover:bg-muted/60'}`}>
                    <div className="text-2xl">{animal.emoji}</div>
                    <p className="mt-1 text-xs font-black text-foreground">{animal.label}</p>
                    <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                      {animal.description}
                    </p>
                  </button>)}
              </div>

              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                    {currentAnimal?.label} styles
                  </p>
                  <p className="text-xs text-muted-foreground/80">
                    {animalType === 'cat' ? 'Choose black, calico, gray, white, tuxedo, or tabby.' : animalType === 'narwhal' ? 'Choose blue, purple, blue-gray, and icy ocean shades.' : 'Choose a classic bird color.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {currentOptions.map(option => {
              const isSelected = animalSkin === option.value;
              return <button key={option.value} onClick={() => selectSkin(option.value)} className={`group flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition hover:scale-105 ${isSelected ? 'border-foreground bg-foreground text-background' : 'border-border bg-muted text-foreground hover:bg-muted/70'}`} title={option.label}>
                      <span className="h-5 w-5 rounded-full border border-black/20" style={{
                  background: option.value === 'cat-calico' ? 'linear-gradient(135deg,#f8fafc 0 34%,#f97316 34% 68%,#111827 68%)' : option.value === 'cat-tuxedo' ? 'linear-gradient(135deg,#111827 0 55%,#f8fafc 55%)' : option.swatch
                }} />

                      <span className="hidden sm:inline">{option.label}</span>
                    </button>;
            })}
              </div>
            </motion.div>}
        </AnimatePresence>

        <div className="relative" style={{
        width: W,
        maxWidth: '100%'
      }}>
          <canvas ref={canvasRef} width={W} height={H} className="select-none rounded-2xl" style={{
          border: '1px solid rgba(27,219,219,0.3)',
          boxShadow: '0 0 40px rgba(27,219,219,0.12)',
          display: 'block',
          width: '100%',
          height: 'auto',
          touchAction: 'none',
          imageRendering: 'auto'
        }} />

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
                <div className="mb-3 text-5xl">{currentAnimal?.emoji ?? '🐔'}</div>

                <h2 className="mb-1 text-2xl font-black" style={{
              fontFamily: 'var(--font-heading)',
              color: '#ffffff'
            }}>
                  {deathReasonRef.current}
                </h2>

                <p className="mb-1 text-sm" style={{
              color: 'rgba(255,255,255,0.65)'
            }}>
                  Score:{' '}
                  <span className="font-bold" style={{
                color: '#ffffff'
              }}>
                    {score}
                  </span>
                </p>

                <p className="mb-5 text-xs" style={{
              color: 'rgba(255,255,255,0.45)'
            }}>
                  Best:{' '}
                  <span style={{
                color: '#fbbf24'
              }}>
                    {bestScore}
                  </span>
                </p>

                <div className="flex items-center gap-3">
                  <button onClick={handleReset} className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all hover:scale-105" style={{
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

        <div className="flex w-full max-w-[540px] items-center justify-between gap-6">
          <DPad />

          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl font-black" style={{
            color: '#1BDBDB',
            fontFamily: 'var(--font-heading)'
          }}>
              {score}
            </span>
            <span className="text-xs text-muted-foreground">score</span>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border/30 px-3 py-2" style={{
          background: 'var(--surface-card)'
        }}>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{
            background: chipColor || '#1BDBDB'
          }}>
              {currentAnimal?.emoji}
            </div>

            <div className="min-w-0">
              <span className="block truncate text-xs text-muted-foreground">{userName}</span>
              <span className="block text-[10px] text-muted-foreground/60">
                {currentAnimal?.label}
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground/60">
          Arrow keys · WASD · D-pad to hop
        </p>
      </div>
    </AppLayout>;
}
