// Dust Dash – the camera tour at the end of a round. When the time is up
// the camera flies slowly through the hall for ten seconds, low over the
// floor at first and then up to a view over the whole hall, so everybody
// sees how much was cleaned (the clean wood where the nozzles went). Then
// the receipt with the result appears. A click or a key skips the tour.
// Players who asked their system for less motion get three still pictures
// instead of the flight.

import * as THREE from './vendor/three.module.js';

const DURATION = 10; // seconds

// The way of the camera and the points it looks at, laid out by hand in
// the hall of hall.js (56 x 36 m): it starts low near the front left corner,
// glides along the sunny front windows, rises over the middle and ends high
// in the back right corner looking over the whole hall. It keeps clear of
// the posts (x = ±6 and ±18, z = ±9) and stays under the roof beams.
const PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-21, 1.4, 15.8),
  new THREE.Vector3(-13, 2.0, 14.6),
  new THREE.Vector3(-2, 3.0, 13.6),
  new THREE.Vector3(7, 3.7, 4),
  new THREE.Vector3(16, 4.3, -5),
  new THREE.Vector3(25.5, 4.7, -16.5),
]);
const LOOK = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-8, 0.2, 8),
  new THREE.Vector3(0, 0.2, 6),
  new THREE.Vector3(8, 0, 1),
  new THREE.Vector3(10, 0, -6),
  new THREE.Vector3(2, 0, -2),
  new THREE.Vector3(-6, 0, 6),
]);
// The three still pictures for reduced motion (places on the way, 0..1).
const STILLS = [0.12, 0.55, 1];

/** Slow at the start and at the end, even in between. */
const ease = (t) => t * t * (3 - 2 * t);

export function createTour(camera, calm) {
  const at = new THREE.Vector3();
  const look = new THREE.Vector3();
  let time = DURATION;

  function place(k) {
    PATH.getPointAt(k, at);
    LOOK.getPointAt(k, look);
    camera.position.copy(at);
    camera.lookAt(look);
  }

  return {
    start() {
      time = 0;
    },
    /** Ends the tour at once (the player clicked or pressed a key). */
    skip() {
      time = DURATION;
    },
    /** True while the camera is still flying. */
    running: () => time < DURATION,
    /** 0 at the start of the tour, 1 at its end. */
    progress: () => Math.min(1, time / DURATION),

    /** Moves the camera on by dt seconds. */
    update(dt) {
      time = Math.min(DURATION, time + dt);
      const t = time / DURATION;
      if (calm) {
        place(STILLS[Math.min(STILLS.length - 1, Math.floor(t * STILLS.length))]);
      } else {
        place(ease(t));
      }
    },
  };
}
