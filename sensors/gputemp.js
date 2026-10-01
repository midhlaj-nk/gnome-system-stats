/* GPU temperature from hwmon (amdgpu edge, nouveau/i915 fallbacks). */
const Me = imports.misc.extensionUtils.getCurrentExtension();
const HwMon = Me.imports.sensors.hwmon;

const SOURCES = [
    ['amdgpu', 'edge'],
    ['nouveau', null],
    ['i915', null],
];

let path = null;

var Sensor = {
    id: 'gputemp',
    label: 'GPU temp',
    icon: 'sysov-gpu-symbolic',
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
            path = null;
            return;
        }
        this.value = HwMon.toCelsius(raw);
        this.text = this.value + '°C';
    },

    color(v) {
        return v > 85 ? '#e01b24' : (v > 70 ? '#f5a623' : null);
    },
};
