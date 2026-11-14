/**
 * Face API utilities for SICAD
 * Handles model loading, face descriptor extraction, and comparison.
 * Only import this module in 'use client' components.
 */

import type * as faceapiType from 'face-api.js';

let faceapi: typeof faceapiType | null = null;
let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

const MODEL_URL = '/models';

/**
 * Dynamically import face-api.js (client-side only)
 */
async function getFaceApi(): Promise<typeof faceapiType> {
  if (faceapi) return faceapi;
  const mod = await import('face-api.js');
  faceapi = mod;
  return mod;
}

/**
 * Load the required face-api.js neural network models.
 * Safe to call multiple times — only loads once.
 */
export async function loadModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const api = await getFaceApi();
    await Promise.all([
      api.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      api.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      api.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
  })();

  return loadingPromise;
}

/**
 * Check if models are loaded
 */
export function areModelsLoaded(): boolean {
  return modelsLoaded;
}

/**
 * Detect a single face in an image and return its 128-dimensional descriptor.
 * Returns null if no face is detected.
 */
export async function extractFaceDescriptor(
  input: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<Float32Array | null> {
  const api = await getFaceApi();
  if (!modelsLoaded) await loadModels();

  const detection = await api
    .detectSingleFace(input, new api.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection?.descriptor ?? null;
}

/**
 * Detect ALL faces in an image and return their descriptors.
 */
export async function extractAllFaceDescriptors(
  input: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<Float32Array[]> {
  const api = await getFaceApi();
  if (!modelsLoaded) await loadModels();

  const detections = await api
    .detectAllFaces(input, new api.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections.map((d) => d.descriptor);
}

/**
 * Stored descriptor record from the database
 */
export interface StoredDescriptor {
  fotoId: string;
  individuoId: string;
  descriptor: number[];
  // Joined data for display
  individuoNome?: string;
  individuoVulgo?: string;
  storagePath?: string;
}

/**
 * Match result
 */
export interface FaceMatch {
  fotoId: string;
  individuoId: string;
  individuoNome?: string;
  individuoVulgo?: string;
  storagePath?: string;
  distance: number;
  /** Similarity percentage (0-100), higher = more similar */
  similarity: number;
}

/**
 * Compare a query face descriptor against a list of stored descriptors.
 * Returns matches sorted by similarity (best first), filtered by threshold.
 *
 * @param queryDescriptor - The 128-dim descriptor of the query face
 * @param storedDescriptors - Array of stored descriptors from the database
 * @param threshold - Max Euclidean distance to consider a match (default 0.6)
 */
export async function findFaceMatches(
  queryDescriptor: Float32Array,
  storedDescriptors: StoredDescriptor[],
  threshold: number = 0.6
): Promise<FaceMatch[]> {
  const api = await getFaceApi();

  const matches: FaceMatch[] = [];

  for (const stored of storedDescriptors) {
    if (!stored.descriptor || stored.descriptor.length !== 128) continue;

    const distance = api.euclideanDistance(
      Array.from(queryDescriptor),
      stored.descriptor
    );

    if (distance <= threshold) {
      // Convert distance to similarity percentage
      // distance 0 = 100% match, distance 0.6 = 0% match
      const similarity = Math.max(0, Math.round((1 - distance / threshold) * 100));

      matches.push({
        fotoId: stored.fotoId,
        individuoId: stored.individuoId,
        individuoNome: stored.individuoNome,
        individuoVulgo: stored.individuoVulgo,
        storagePath: stored.storagePath,
        distance,
        similarity,
      });
    }
  }

  // Sort by distance (lowest = best match)
  matches.sort((a, b) => a.distance - b.distance);

  // Deduplicate by individuoId (keep best match per individual)
  const seen = new Set<string>();
  const deduped: FaceMatch[] = [];
  for (const match of matches) {
    if (!seen.has(match.individuoId)) {
      seen.add(match.individuoId);
      deduped.push(match);
    }
  }

  return deduped;
}

/**
 * Load an image from a File object into an HTMLImageElement.
 */
export function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    const url = URL.createObjectURL(file);
    img.src = url;
  });
}
