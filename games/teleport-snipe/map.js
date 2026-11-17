// Teleport Snipe – the temple garden as numbers. The garden is a square
// around the middle (x and z from -SIZE/2 to +SIZE/2, y is up). What it
// looks like is in mapView.js; this file only says where things are.
// Step 2 of the plan adds the boxes, stairs and standing spots here.

/** Length of one side of the garden inside the temple wall (metres). */
export const SIZE = 50;
/** Height of the temple wall around everything (too high to jump on). */
export const WALL_HEIGHT = 4;

/**
 * The two fixed start points on opposite sides of the garden. A view
 * direction (yaw) of 0 looks towards -z, so both start out looking at the
 * middle. Players swap sides every round.
 */
export const STARTS = [
  { x: 0, z: 21, yaw: 0 },
  { x: 0, z: -21, yaw: Math.PI },
];

/** The start point of a seat in a round (round 1, 2, 3, ...). */
export function startOf(seat, round) {
  return STARTS[(seat + round - 1) % 2];
}
