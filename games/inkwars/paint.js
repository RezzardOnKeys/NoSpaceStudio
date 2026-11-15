// Inkwars – the colour mask: one top-down texture for every surface that
// can be walked on and one small texture per wall face. The same data gives
// the picture, the answer to "which colour is here" and the score.
// With "log" switched on every splat is written down, so the party host can
// send the splats to the guest, who repeats them exactly (see host.js).

import * as THREE from './vendor/three.module.js';
import { CONFIG } from './config.js';
function makeTexture(data, w, h) {
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}
export class Paint {
  constructor(arena) {
    this.arena = arena;
    this.tpm = CONFIG.arena.texelsPerMeter;
    this.counts = [0, 0, 0];
    this.walls = new Map();
    // A list that collects every splat while it is not null (party host).
    this.log = null;
    // true on a party guest: only splats sent by the host are painted.
    this.readOnly = false;
    this.rgb = [
      [0, 0, 0],
      [255, 0, 128],
      [0, 200, 200],
    ];
    this.dirty = false;
    this.TW = arena.W * this.tpm;
    this.TH = arena.D * this.tpm;
    this.total = this.TW * this.TH;
    this.team = new Uint8Array(this.total);
    this.locked = new Uint8Array(this.total);
    this.heights = new Float32Array(this.total);
    this.data = new Uint8Array(this.total * 4);
    this.texture = makeTexture(this.data, this.TW, this.TH);
    for (let iz = 0; iz < this.TH; iz++) {
      for (let ix = 0; ix < this.TW; ix++) {
        const x = (ix + 0.5) / this.tpm - arena.hw;
        const z = (iz + 0.5) / this.tpm - arena.hd;
        const i = iz * this.TW + ix;
        this.heights[i] = arena.heightAt(x, z);
        const s = arena.shapeAt(x, z);
        if (s && s.lock) this.locked[i] = s.lock;
      }
    }
    for (const s of arena.shapes) {
      if (s.kind !== 'box') continue;
      for (let face = 0; face < 4; face++) {
        const alongX = face >= 2;
        const start = alongX ? s.x0 : s.z0;
        const len = alongX ? s.x1 - s.x0 : s.z1 - s.z0;
        const height = s.h - s.y0;
        const w = Math.max(2, Math.round(len * this.tpm));
        const h = Math.max(2, Math.round(height * this.tpm));
        const data = new Uint8Array(w * h * 4);
        this.walls.set(s.id * 4 + face, {
          w,
          h,
          start,
          len,
          y0: s.y0,
          height,
          team: new Uint8Array(w * h),
          data,
          texture: makeTexture(data, w, h),
          dirty: false,
        });
      }
    }
    this.reset();
  }
  setColors(c1, c2) {
    const toRgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
    this.rgb = [[0, 0, 0], toRgb(c1), toRgb(c2)];
  }
  reset() {
    this.counts[0] = this.total;
    this.counts[1] = 0;
    this.counts[2] = 0;
    for (let i = 0; i < this.total; i++) {
      const t = this.locked[i];
      this.team[i] = t;
      if (t) {
        this.counts[0]--;
        this.counts[t]++;
      }
      this.write(this.data, i, t);
    }
    this.dirty = true;
    for (const w of this.walls.values()) {
      w.team.fill(0);
      w.data.fill(0);
      w.dirty = true;
    }
  }
  write(data, i, team) {
    const c = this.rgb[team];
    const o = i * 4;
    data[o] = c[0];
    data[o + 1] = c[1];
    data[o + 2] = c[2];
    data[o + 3] = team ? 255 : 0;
  }
  /**
   * A splat on a surface that can be walked on. yRef keeps the colour from
   * jumping over edges onto other levels.
   */
  paintFloor(x, z, r, team, yRef) {
    if (this.readOnly) return;
    const phase = Math.random() * 6.28;
    if (this.log) this.log.push([0, x, z, r, team, yRef, phase]);
    this.splatFloor(x, z, r, team, yRef, phase);
  }
  /** phase turns the irregular edge of the splat; the guest gets the host's value. */
  splatFloor(x, z, r, team, yRef, phase) {
    const cx = (x + this.arena.hw) * this.tpm;
    const cz = (z + this.arena.hd) * this.tpm;
    const rr = r * this.tpm;
    const x0 = Math.max(0, Math.floor(cx - rr));
    const x1 = Math.min(this.TW - 1, Math.ceil(cx + rr));
    const z0 = Math.max(0, Math.floor(cz - rr));
    const z1 = Math.min(this.TH - 1, Math.ceil(cz + rr));
    for (let iz = z0; iz <= z1; iz++) {
      for (let ix = x0; ix <= x1; ix++) {
        const dx = ix + 0.5 - cx;
        const dz = iz + 0.5 - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 > rr * rr) continue;
        // an irregular edge, so it looks like a splat
        const rad = rr * (0.8 + 0.2 * Math.sin(Math.atan2(dz, dx) * 5 + phase));
        if (d2 > rad * rad) continue;
        const i = iz * this.TW + ix;
        if (Math.abs(this.heights[i] - yRef) > 0.75) continue;
        if (this.locked[i] && this.locked[i] !== team) continue;
        const old = this.team[i];
        if (old === team) continue;
        this.counts[old]--;
        this.counts[team]++;
        this.team[i] = team;
        this.write(this.data, i, team);
        this.dirty = true;
      }
    }
  }
  floorTeamAt(x, z) {
    const ix = Math.floor((x + this.arena.hw) * this.tpm);
    const iz = Math.floor((z + this.arena.hd) * this.tpm);
    if (ix < 0 || iz < 0 || ix >= this.TW || iz >= this.TH) return 0;
    return this.team[iz * this.TW + ix];
  }
  wall(s, face) {
    return this.walls.get(s.id * 4 + face);
  }
  paintWall(s, face, along, y, r, team) {
    if (this.readOnly) return;
    const phase = Math.random() * 6.28;
    if (this.log) this.log.push([1, s.id, face, along, y, r, team, phase]);
    this.splatWall(s, face, along, y, r, team, phase);
  }
  splatWall(s, face, along, y, r, team, phase) {
    const w = this.wall(s, face);
    if (!w) return;
    const cu = ((along - w.start) / w.len) * w.w;
    const cv = ((y - w.y0) / w.height) * w.h;
    const rr = r * this.tpm;
    const u0 = Math.max(0, Math.floor(cu - rr));
    const u1 = Math.min(w.w - 1, Math.ceil(cu + rr));
    const v0 = Math.max(0, Math.floor(cv - rr));
    const v1 = Math.min(w.h - 1, Math.ceil(cv + rr));
    for (let iv = v0; iv <= v1; iv++) {
      for (let iu = u0; iu <= u1; iu++) {
        const du = iu + 0.5 - cu;
        const dv = iv + 0.5 - cv;
        const d2 = du * du + dv * dv;
        const rad = rr * (0.8 + 0.2 * Math.sin(Math.atan2(dv, du) * 5 + phase));
        if (d2 > rad * rad) continue;
        const i = iv * w.w + iu;
        if (w.team[i] === team) continue;
        w.team[i] = team;
        this.write(w.data, i, team);
        w.dirty = true;
      }
    }
  }
  wallTeamAt(s, face, along, y) {
    const w = this.wall(s, face);
    if (!w) return 0;
    const iu = Math.min(w.w - 1, Math.max(0, Math.floor(((along - w.start) / w.len) * w.w)));
    const iv = Math.min(w.h - 1, Math.max(0, Math.floor(((y - w.y0) / w.height) * w.h)));
    return w.team[iv * w.w + iu];
  }
  /** Repeats a splat from the host's log (see paintFloor and paintWall). */
  apply(op) {
    if (op[0] === 0) this.splatFloor(op[1], op[2], op[3], op[4], op[5], op[6]);
    else this.splatWall(this.arena.shapes[op[1]], op[2], op[3], op[4], op[5], op[6], op[7]);
  }
  /**
   * The whole colour mask as one small package, for a guest who joins a
   * running match. Long runs of the same team are stored as [team, length].
   */
  exportState() {
    const parts = [this.team, ...[...this.walls.values()].map((w) => w.team)];
    const out = [];
    for (const part of parts) {
      for (let i = 0; i < part.length;) {
        let n = 1;
        while (n < 255 && i + n < part.length && part[i + n] === part[i]) n++;
        out.push(part[i], n);
        i += n;
      }
    }
    return new Uint8Array(out).buffer;
  }
  /** Takes over a colour mask made by exportState(). */
  importState(buffer) {
    const packed = new Uint8Array(buffer);
    const parts = [this.team, ...[...this.walls.values()].map((w) => w.team)];
    let part = 0;
    let at = 0;
    for (let k = 0; k + 1 < packed.length && part < parts.length; k += 2) {
      const team = packed[k] <= 2 ? packed[k] : 0;
      parts[part].fill(team, at, at + packed[k + 1]);
      at += packed[k + 1];
      if (at >= parts[part].length) {
        part++;
        at = 0;
      }
    }
    this.counts = [0, 0, 0];
    for (let i = 0; i < this.total; i++) {
      this.counts[this.team[i]]++;
      this.write(this.data, i, this.team[i]);
    }
    this.dirty = true;
    for (const w of this.walls.values()) {
      for (let i = 0; i < w.team.length; i++) this.write(w.data, i, w.team[i]);
      w.dirty = true;
    }
  }
  /** The share of the area a team has painted, in percent. */
  percent(team) {
    return (this.counts[team] / this.total) * 100;
  }
  /** Sends changed textures to the graphics card once per frame. */
  flush() {
    if (this.dirty) {
      this.texture.needsUpdate = true;
      this.dirty = false;
    }
    for (const w of this.walls.values()) {
      if (w.dirty) {
        w.texture.needsUpdate = true;
        w.dirty = false;
      }
    }
  }
}
