/**
 * Bridson's Poisson Disc Sampling 2D
 * Generates an organic, uniform distribution of points within [-range, range]
 * without artificial clustering or clumping.
 */

export interface Point2D {
  x: number;
  y: number;
}

export function generatePoissonDisc(
  width: number = 500,
  height: number = 500,
  minDist: number = 5.5,
  maxTries: number = 20
): Float32Array {
  const cellSize = minDist / Math.SQRT2;
  const gridW = Math.ceil(width / cellSize);
  const gridH = Math.ceil(height / cellSize);
  const grid: (Point2D | null)[] = new Array(gridW * gridH).fill(null);

  const points: Point2D[] = [];
  const spawnPoints: Point2D[] = [];

  // Seed with center point
  const initialPoint: Point2D = { x: width * 0.5, y: height * 0.5 };
  points.push(initialPoint);
  spawnPoints.push(initialPoint);

  const initGx = Math.floor(initialPoint.x / cellSize);
  const initGy = Math.floor(initialPoint.y / cellSize);
  grid[initGx + initGy * gridW] = initialPoint;

  while (spawnPoints.length > 0) {
    const spawnIndex = Math.floor(Math.random() * spawnPoints.length);
    const spawnCenter = spawnPoints[spawnIndex];
    let candidateAccepted = false;

    for (let i = 0; i < maxTries; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = minDist * (1 + Math.random());
      const candX = spawnCenter.x + radius * Math.cos(angle);
      const candY = spawnCenter.y + radius * Math.sin(angle);

      if (candX >= 0 && candX < width && candY >= 0 && candY < height) {
        const gx = Math.floor(candX / cellSize);
        const gy = Math.floor(candY / cellSize);

        let valid = true;
        const minX = Math.max(0, gx - 2);
        const maxX = Math.min(gridW - 1, gx + 2);
        const minY = Math.max(0, gy - 2);
        const maxY = Math.min(gridH - 1, gy + 2);

        for (let x = minX; x <= maxX; x++) {
          for (let y = minY; y <= maxY; y++) {
            const neighbor = grid[x + y * gridW];
            if (neighbor) {
              const dx = neighbor.x - candX;
              const dy = neighbor.y - candY;
              if (dx * dx + dy * dy < minDist * minDist) {
                valid = false;
                break;
              }
            }
          }
          if (!valid) break;
        }

        if (valid) {
          const newPoint: Point2D = { x: candX, y: candY };
          points.push(newPoint);
          spawnPoints.push(newPoint);
          grid[gx + gy * gridW] = newPoint;
          candidateAccepted = true;
          break;
        }
      }
    }

    if (!candidateAccepted) {
      spawnPoints.splice(spawnIndex, 1);
    }
  }

  // Normalize points from [0, width] x [0, height] to [-1, 1] range centered at (0, 0)
  const halfW = width * 0.5;
  const halfH = height * 0.5;
  const result = new Float32Array(points.length * 2);

  for (let i = 0; i < points.length; i++) {
    result[i * 2 + 0] = (points[i].x - halfW) / halfW;
    result[i * 2 + 1] = (points[i].y - halfH) / halfH;
  }

  return result;
}
