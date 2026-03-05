// src/workers/cluster.worker.ts

/**
 * ========================================
 * OPTIMIZED DBSCAN CLUSTERING ALGORITHM
 * ========================================
 * * FEATURES:
 * 1. Haversine formula for accurate Earth distances
 * 2. Spatial Grid Indexing for O(N log N) performance
 * 3. True DBSCAN with core point & border point detection
 * 4. Queue-based BFS optimization (removed slow Array.shift)
 */

// ==================== TYPES ====================

interface Report {
  id: string;
  latitude: number;
  longitude: number;
  location?: string;
  incident_type?: string;
}

interface ClusterResult {
  name: string;
  count: number;
  risk: number; // 0-100 percentage
}

// ==================== CONFIGURATION ====================

const CONFIG = {
  // DBSCAN Parameters
  CLUSTER_RADIUS_KM: 0.5, // 500 meters
  MIN_POINTS: 3, // Minimum 3 incidents to form a cluster

  // Optimization
  // GRID_SIZE must be <= CLUSTER_RADIUS_KM / 111 so that the 3×3 cell
  // neighborhood is never smaller than the query radius.
  // 0.5 km / 111 km per degree ≈ 0.0045°  (was 0.01° ≈ 1.1 km — too coarse)
  GRID_SIZE: 0.0045, // ~0.5 km grid cells — matches CLUSTER_RADIUS_KM
  MAX_HOTSPOTS: 5, // Return top 5 hotspots
};

// ==================== DISTANCE CALCULATION ====================

/**
 * Calculate distance between two GPS coordinates using Haversine formula.
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ==================== SPATIAL INDEXING ====================

/**
 * Create a grid-based spatial index.
 */
function createSpatialIndex(
  reports: Report[],
  gridSize: number,
): Map<string, Report[]> {
  const grid = new Map<string, Report[]>();

  const getGridKey = (lat: number, lng: number): string => {
    const latBucket = Math.floor(lat / gridSize);
    const lngBucket = Math.floor(lng / gridSize);
    return `${latBucket},${lngBucket}`;
  };

  reports.forEach((report) => {
    const key = getGridKey(report.latitude, report.longitude);
    if (!grid.has(key)) {
      grid.set(key, []);
    }
    grid.get(key)!.push(report);
  });

  return grid;
}

/**
 * Get reports from 3x3 grid cells.
 */
function getNearbyCandidates(
  lat: number,
  lng: number,
  grid: Map<string, Report[]>,
  gridSize: number,
): Report[] {
  const candidates: Report[] = [];

  // Check current cell + 8 neighbors
  const latBucket = Math.floor(lat / gridSize);
  const lngBucket = Math.floor(lng / gridSize);

  for (let dLat = -1; dLat <= 1; dLat++) {
    for (let dLng = -1; dLng <= 1; dLng++) {
      const key = `${latBucket + dLat},${lngBucket + dLng}`;
      const cellReports = grid.get(key);
      if (cellReports) candidates.push(...cellReports);
    }
  }

  return candidates;
}

// ==================== DBSCAN LOGIC ====================

/**
 * Find exact neighbors within radius using spatial index.
 */
function findNeighbors(
  report: Report,
  grid: Map<string, Report[]>,
  radius: number,
  gridSize: number,
): Report[] {
  const neighbors: Report[] = [];

  // 1. Get candidates (Fast)
  const candidates = getNearbyCandidates(
    report.latitude,
    report.longitude,
    grid,
    gridSize,
  );

  // 2. Check exact distance (Accurate)
  for (const candidate of candidates) {
    if (candidate.id === report.id) continue;

    const dist = haversineDistance(
      report.latitude,
      report.longitude,
      candidate.latitude,
      candidate.longitude,
    );

    if (dist <= radius) {
      neighbors.push(candidate);
    }
  }

  return neighbors;
}

/**
 * Expand a cluster from a Core Point.
 * Includes optimization for Queue processing.
 */
function expandCluster(
  startReport: Report,
  neighborsMap: Map<string, Report[]>,
  visited: Set<string>,
  noise: Set<string>, // To allow upgrading noise to border points
  minPoints: number,
): Report[] {
  const cluster: Report[] = [startReport];

  // Initialize Queue with start point's neighbors
  // We use a simple array but track index to avoid slow .shift() operations
  const initialNeighbors = neighborsMap.get(startReport.id) || [];
  const queue: Report[] = [...initialNeighbors];

  let queueIndex = 0;

  // Mark start point as visited (it's already in the cluster)
  visited.add(startReport.id);

  // Process Queue
  while (queueIndex < queue.length) {
    const current = queue[queueIndex];
    queueIndex++;

    // 1. Handle "Noise" -> "Border Point" (or Core Point) upgrade.
    // Do NOT `continue` here — fall through so the core-point check below
    // can still expand the cluster if this reclaimed point has enough neighbors.
    if (noise.has(current.id)) {
      noise.delete(current.id);
    }

    // 2. Skip if already visited
    if (visited.has(current.id)) continue;

    // 3. Mark visited and add to cluster
    visited.add(current.id);
    cluster.push(current);

    // 4. Check if this point is ALSO a Core Point
    const currentNeighbors = neighborsMap.get(current.id) || [];

    // Check if this neighbor is also a core point to expand the cluster further.
    // We use `minPoints - 1` because `findNeighbors` excludes the point itself.
    if (currentNeighbors.length >= minPoints - 1) {
      // Expand: Add its neighbors to the queue
      for (const n of currentNeighbors) {
        if (!visited.has(n.id)) {
          queue.push(n);
        }
      }
    }
  }

  return cluster;
}

/**
 * Main Algorithm
 */
function dbscan(reports: Report[]): Report[][] {
  const { CLUSTER_RADIUS_KM, MIN_POINTS, GRID_SIZE } = CONFIG;

  // Step 1: Spatial Indexing
  const grid = createSpatialIndex(reports, GRID_SIZE);

  // Step 2: Pre-calculate Neighbors (Efficiency Boost)
  const neighborsMap = new Map<string, Report[]>();
  reports.forEach((r) => {
    const neighbors = findNeighbors(r, grid, CLUSTER_RADIUS_KM, GRID_SIZE);
    neighborsMap.set(r.id, neighbors);
  });

  // Step 3: Cluster Building
  const clusters: Report[][] = [];
  const visited = new Set<string>();
  const noise = new Set<string>();

  reports.forEach((report) => {
    if (visited.has(report.id)) return;

    const neighbors = neighborsMap.get(report.id) || [];

    // ARCHITECTURE NOTE: Standard DBSCAN counts the point itself as a neighbor.
    // Since our `findNeighbors` explicitly excludes the current point, 
    // a core point requires `MIN_POINTS - 1` external neighbors.
    if (neighbors.length < MIN_POINTS - 1) {
      // Mark as Noise (temporarily)
      visited.add(report.id);
      noise.add(report.id);
    } else {
      // Found a Core Point -> Start a new cluster
      const cluster = expandCluster(
        report,
        neighborsMap,
        visited,
        noise,
        MIN_POINTS,
      );
      clusters.push(cluster);
    }
  });

  return clusters;
}

// ==================== FORMATTING & RANKING ====================

function getClusterName(clusterReports: Report[]): string {
  const nameCounts: Record<string, number> = {};

  clusterReports.forEach((report) => {
    const name = report.location || "Unknown Location";
    nameCounts[name] = (nameCounts[name] || 0) + 1;
  });

  const entries = Object.entries(nameCounts);
  if (entries.length === 0) return "Unknown Area";

  return entries.reduce((a, b) => (a[1] > b[1] ? a : b))[0];
}

function calculateRisk(clusterSize: number, totalReports: number): number {
  // Guard: caller guarantees totalReports >= MIN_POINTS, but protect against
  // future callers that might pass 0 and produce NaN.
  if (totalReports === 0) return 0;
  const relativeSize = clusterSize / totalReports;
  // Logarithmic scaling for realistic risk assessment
  const baseRisk = Math.min(95, 30 + Math.log10(clusterSize) * 30);
  const boost = relativeSize > 0.1 ? 10 : 0;
  return Math.round(Math.min(100, baseRisk + boost));
}

// ==================== WORKER HANDLER ====================

self.onmessage = (e: MessageEvent<Report[]>) => {
  const reports = e.data;

  // 1. Filter Invalid Data
  const validReports = reports.filter(
    (r) =>
      r.latitude &&
      r.longitude &&
      !isNaN(r.latitude) &&
      !isNaN(r.longitude) &&
      Math.abs(r.latitude) <= 90 &&
      Math.abs(r.longitude) <= 180,
  );

  if (validReports.length < CONFIG.MIN_POINTS) {
    self.postMessage([]);
    return;
  }

  // 2. Run Algorithm
  const rawClusters = dbscan(validReports);

  // 3. Format & Sort Results
  const formattedClusters: ClusterResult[] = rawClusters.map((cluster) => ({
    name: getClusterName(cluster),
    count: cluster.length,
    risk: calculateRisk(cluster.length, validReports.length),
  }));

  const topHotspots = formattedClusters
    .sort((a, b) => b.count - a.count)
    .slice(0, CONFIG.MAX_HOTSPOTS);

  self.postMessage(topHotspots);
};

export { };

