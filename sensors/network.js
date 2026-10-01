/* Network throughput from /proc/net/dev (sum of all non-loopback ifaces). */
const { GLib } = imports.gi;
const ByteArray = imports.byteArray;

let prevRx = 0;
let prevTx = 0;
let prevT = 0;

function fmt(bytesPerSec) {
    if (bytesPerSec > 1048576) return (bytesPerSec / 1048576).toFixed(1) + 'M';
    if (bytesPerSec > 1024) return Math.round(bytesPerSec / 1024) + 'K';
    return Math.round(bytesPerSec) + 'B';
}

function readBytes() {
    let [ok, contents] = GLib.file_get_contents('/proc/net/dev');
    if (!ok) return [0, 0];
    let rx = 0, tx = 0;
    ByteArray.toString(contents).split('\n').forEach(l => {
        let idx = l.indexOf(':');
        if (idx < 0) return;
        let name = l.slice(0, idx).trim();
        if (name === 'lo') return;
        let parts = l.slice(idx + 1).trim().split(/\s+/).map(Number);
        rx += parts[0];      // bytes received
        tx += parts[8];      // bytes transmitted
    });
    return [rx, tx];
}

var Sensor = {
    id: 'network',
    label: 'Net',
    icon: 'network-transmit-receive-symbolic',
    section: 'Network',
    interval: 2,
    pinned: false,
    text: '…',
    value: 0,

    read() {
        let [rx, tx] = readBytes();
        let now = GLib.get_monotonic_time() / 1e6;
        let dt = now - prevT;
        if (prevT > 0 && dt > 0) {
            let down = (rx - prevRx) / dt;
            let up = (tx - prevTx) / dt;
            this.text = '↓' + fmt(down) + '  ↑' + fmt(up);
        }
        prevRx = rx;
        prevTx = tx;
        prevT = now;
    },
};
