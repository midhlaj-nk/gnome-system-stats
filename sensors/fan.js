/* Fan speed from hwmon: the fastest of however many fans the chip exposes. */
import * as HwMon from './hwmon.js';

const CHIPS = ['thinkpad', 'dell_smm', 'asus', 'acpi_fan'];

let base = null;

export const Sensor = {
    id: 'fan',
    label: 'Fan',
    icon: 'sysov-fan-symbolic',
    section: 'System',
    interval: 5,
    pinned: false,
    text: '…',
    value: 0,

    read() {
        if (!base) {
            for (let chip of CHIPS) {
                base = HwMon.findChip(chip);
                if (base) break;
            }
        }
        if (!base) {
            this.text = 'n/a';
            return;
        }
        /* Some chips publish inputs that are always empty; skip anything that
         * does not parse rather than letting one NaN hide a real reading. */
        let best = null;
        for (let i = 1; i <= 8; i++) {
            let raw = HwMon.readValue(`${base}/fan${i}_input`);
            if (raw === null || raw === '')
                continue;
            let rpm = parseInt(raw, 10);
            if (!Number.isNaN(rpm) && (best === null || rpm > best))
                best = rpm;
        }
        if (best === null) {
            base = null;              // chip renumbered; re-resolve next tick
            return;
        }
        this.value = best;
        this.text = best === 0 ? 'off' : best + ' rpm';
    },

    color(v) {
        return v > 4200 ? '#e01b24' : (v > 3200 ? '#f5a623' : null);
    },
};
