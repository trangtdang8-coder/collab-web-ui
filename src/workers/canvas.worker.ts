import { WorkerMessage, StrokeData } from '../types/canvas';

let ctx: OffscreenCanvasRenderingContext2D | null = null;
let canvas: OffscreenCanvas | null = null;
let currentPixelRatio = 1;

// Hold strokes in memory to redraw on resize; capped at 1000 strokes
const strokeHistory: Map<string, StrokeData> = new Map();
const MAX_STROKES = 1000;

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  if (msg.type === 'PING') {
    self.postMessage({ type: 'PONG' });
    return;
  }

  switch (msg.type) {
    case 'INIT': {
      canvas = msg.canvas;
      currentPixelRatio = msg.pixelRatio;
      canvas.width = msg.width * currentPixelRatio;
      canvas.height = msg.height * currentPixelRatio;
      
      // desynchronized: true bypasses the main thread compositor for lower touch latency
      ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }) as OffscreenCanvasRenderingContext2D;
      
      if (ctx) {
        ctx.scale(currentPixelRatio, currentPixelRatio);
        ctx.fillStyle = '#09090b'; // zinc-950 background
        ctx.fillRect(0, 0, msg.width, msg.height);
      }
      break;
    }
    
    case 'DRAW_STROKE': {
      if (!ctx) return;
      strokeHistory.set(msg.stroke.id, msg.stroke);
      if (strokeHistory.size > MAX_STROKES) {
        const oldest = strokeHistory.keys().next().value;
        if (oldest) strokeHistory.delete(oldest);
      }
      drawStroke(msg.stroke);
      break;
    }

    case 'CLEAR': {
      if (!ctx || !canvas) return;
      strokeHistory.clear();
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      break;
    }

    case 'RESIZE': {
      if (!ctx || !canvas) return;
      currentPixelRatio = msg.pixelRatio;
      canvas.width = msg.width * currentPixelRatio;
      canvas.height = msg.height * currentPixelRatio;
      ctx.scale(currentPixelRatio, currentPixelRatio);
      
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, msg.width, msg.height);
      
      // Replay history to prevent data loss on device rotation
      for (const stroke of strokeHistory.values()) {
        drawStroke(stroke);
      }
      break;
    }

    case 'TERMINATE': {
      strokeHistory.clear();
      ctx = null;
      canvas = null;
      self.close();
      break;
    }
  }
};

function drawStroke(stroke: StrokeData) {
  if (!ctx || stroke.points.length === 0) return;

  ctx.beginPath();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;

  const firstPoint = stroke.points[0];
  ctx.moveTo(firstPoint.x, firstPoint.y);

  // Implement quadratic curve interpolation for smooth ink
  for (let i = 1; i < stroke.points.length - 1; i++) {
    const p1 = stroke.points[i];
    const p2 = stroke.points[i + 1];
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    
    ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
  }

  const lastPoint = stroke.points[stroke.points.length - 1];
  ctx.lineTo(lastPoint.x, lastPoint.y);
  ctx.stroke();
}
