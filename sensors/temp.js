/* CPU package temperature from hwmon. */
import * as HwMon from './hwmon.js';

/* First match wins: AMD Tctl, Intel package, then the ThinkPad EC reading. */
const SOURCES = [
    ['k10temp', 'Tctl'],
    ['coretemp', 'Package id 0'],
    ['thinkpad', 'CPU'],
];

let path = null;

export const Sensor = {
    id: 'temp',
    label: 'CPU temp',
    icon: 'sysov-temp-symbolic',
    section: 'System',
    interval: 5,
    pinned: false,
    text: '…',
    value: 0,

    read() {
        if (!path) {
            for (let [chip, label] of SOURCES) {
                path = HwMon.findInput(chip, label);
                if (path) break;
            }
        }
        if (!path) {
            this.text = 'n/a';
            return;
        }
        let raw = HwMon.readValue(path);
        if (raw === null) {
            path = null;              // chip renumbered; re-resolve next tick
            return;
        }
        this.value = HwMon.toCelsius(raw);
        this.text = this.value + '°C';
    },

    /* Tjmax on recent AMD mobile parts is ~95-100C. */
    color(v) {
        return v > 90 ? '#e01b24' : (v > 75 ? '#f5a623' : null);
    },
};
