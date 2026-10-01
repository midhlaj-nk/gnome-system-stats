/* RAM usage from /proc/meminfo. */
import GLib from 'gi://GLib';

const decoder = new TextDecoder();

export const Sensor = {
    id: 'memory',
    label: 'RAM',
    icon: 'sysov-ram-symbolic',
    section: 'System',
    interval: 5,
    pinned: false,
    text: '…',
    value: 0,

    read() {
        let [ok, contents] = GLib.file_get_contents('/proc/meminfo');
        if (!ok) return;
        let m = {};
        decoder.decode(contents).split('\n').forEach(l => {
            let idx = l.indexOf(':');
            if (idx > 0) m[l.slice(0, idx)] = parseInt(l.slice(idx + 1), 10);
        });
        let total = m.MemTotal;
        let avail = m.MemAvailable;
        if (!total || avail === undefined) return;
        let usedKb = total - avail;
        let pct = Math.round(100 * usedKb / total);
        let usedG = (usedKb / 1048576).toFixed(1);
        let totG = (total / 1048576).toFixed(1);
        this.value = pct;
        this.text = usedG + '/' + totG + 'G';
    },

    color(v) {
        return v > 90 ? '#e01b24' : (v > 75 ? '#f5a623' : null);
    },
};
