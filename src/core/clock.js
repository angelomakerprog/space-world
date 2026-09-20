import { msToJD, jdToMs, centuriesSinceJ2000 } from './orbits.js';

const LOG_MIN = Math.log10(1 / 86400);   // 1 second of sim per second — real time
const LOG_MAX = Math.log10(3652.5);      // 10 years of sim per second
const LOG_SPAN = LOG_MAX - LOG_MIN;

/**
 * The simulation clock. Everything visual reads `jd` (Julian Day) and
 * `T` (Julian centuries since J2000) from here.
 */
export class Clock {
  constructor() {
    this.startMs = Date.now();
    this.jd = msToJD(this.startMs);
    this.startJD = this.jd;
    this.T = centuriesSinceJ2000(this.jd);
    this.rate = 1;            // sim days per real second
    this.dir = 1;             // +1 forward, -1 reversed
    this.paused = false;
    this.elapsedDays = 0;
  }

  /** advance by `dtSeconds` of wall time */
  tick(dtSeconds) {
    if (this.paused) return 0;
    const dDays = this.rate * this.dir * dtSeconds;
    this.jd += dDays;
    this.elapsedDays += dDays;
    this.T = centuriesSinceJ2000(this.jd);
    return dDays;
  }

  get ms() { return jdToMs(this.jd); }
  get date() { return new Date(this.ms); }

  setRate(days) {
    this.rate = Math.min(3652.5, Math.max(1 / 86400, days));
  }
  /** slider position 0..1 <-> logarithmic rate */
  get sliderT() {
    return (Math.log10(this.rate) - LOG_MIN) / LOG_SPAN;
  }
  set sliderT(t) {
    this.setRate(Math.pow(10, LOG_MIN + Math.min(1, Math.max(0, t)) * LOG_SPAN));
  }
  step(mult) {
    this.setRate(this.rate * mult);
  }
  reset() {
    this.startMs = Date.now();
    this.jd = msToJD(this.startMs);
    this.startJD = this.jd;
    this.elapsedDays = 0;
    this.T = centuriesSinceJ2000(this.jd);
  }
}
