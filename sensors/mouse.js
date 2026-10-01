/* Mouse battery via upower (async spawn — upower has no /sys node here). */
const { Gio } = imports.gi;
const ByteArray = imports.byteArray;

const CMD = ['bash', '-c',
    "for d in $(upower -e | grep -i mouse); do " +
    "upower -i \"$d\" | grep -i percentage | grep -oE '[0-9]+'; done"];

var Sensor = {
    id: 'mouse',
    label: 'Mouse',
    icon: 'input-mouse-symbolic',
    section: 'Devices',
    interval: 60,
    pinned: true,
    text: '…',
    value: 100,

    readAsync(done) {
        try {
            let proc = Gio.Subprocess.new(CMD,
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE);
            proc.communicate_utf8_async(null, null, (p, res) => {
                try {
                    let [, stdout] = p.communicate_utf8_finish(res);
                    let pcts = (stdout || '').trim().split('\n')
                        .filter(s => s.length > 0).map(s => parseInt(s, 10));
                    if (pcts.length === 0) {
                        this.text = '--';
                        this.value = 100;
                    } else {
                        this.text = pcts.map(p => p + '%').join(' ');
                        this.value = Math.min(...pcts);
                    }
                } catch (e) {
                    this.text = '?';
                }
                done();
            });
        } catch (e) {
            this.text = '?';
            done();
        }
    },

    color(v) {
        return v < 20 ? '#e01b24' : (v < 50 ? '#f5a623' : '#33d17a');
    },
};
