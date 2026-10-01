/* Laptop battery from /sys/class/power_supply/BAT0. */
import GLib from 'gi://GLib';

const decoder = new TextDecoder();

export function readFile(path) {
    let [ok, contents] = GLib.file_get_contents(path);
    return ok ? decoder.decode(contents).trim() : null;
}

export const Sensor = {
    id: 'battery',
    label: 'Battery',
    icon: 'battery-good-symbolic',
    section: 'System',
    interval: 30,
    pinned: true,
    text: '…',
    value: 100,

    read() {
        let cap = readFile('/sys/class/power_supply/BAT0/capacity');
        if (cap === null) { this.text = 'n/a'; return; }
        let status = readFile('/sys/class/power_supply/BAT0/status') || '';
        let pct = parseInt(cap, 10);
        let glyph = status === 'Charging' ? '⚡' : '';
        this.value = pct;
        this.text = glyph + pct + '%';
    },

    color(v) {
        return v < 15 ? '#e01b24' : (v < 30 ? '#f5a623' : null);
    },
};
