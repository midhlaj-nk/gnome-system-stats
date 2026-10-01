/* CPU usage % from /proc/stat (delta between ticks). */
const { GLib } = imports.gi;
const ByteArray = imports.byteArray;

let prevIdle = 0;
let prevTotal = 0;

var Sensor = {
    id: 'cpu',
    label: 'CPU',
    icon: 'sysov-cpu-symbolic',
    section: 'System',
    interval: 2,
    pinned: false,
    text: '…',
    value: 0,

    read() {
        let [ok, contents] = GLib.file_get_contents('/proc/stat');
        if (!ok) return;
        let line = ByteArray.toString(contents).split('\n')[0];
        let p = line.trim().split(/\s+/).slice(1).map(Number);
        let idle = p[3] + (p[4] || 0);                 // idle + iowait
        let total = p.reduce((a, b) => a + b, 0);
        let dIdle = idle - prevIdle;
        let dTotal = total - prevTotal;
        prevIdle = idle;
        prevTotal = total;
        let usage = dTotal > 0 ? Math.round(100 * (1 - dIdle / dTotal)) : 0;
        this.value = usage;
        this.text = usage + '%';
    },

    color(v) {
        return v > 85 ? '#e01b24' : (v > 60 ? '#f5a623' : null);
    },
};
