/* NVMe composite temperature from hwmon. */
const Me = imports.misc.extensionUtils.getCurrentExtension();
const HwMon = Me.imports.sensors.hwmon;

let path = null;

var Sensor = {
    id: 'nvmetemp',
    label: 'Disk temp',
    icon: 'drive-harddisk-solidstate-symbolic',
    section: 'System',
    interval: 10,
    pinned: false,
    text: '…',
    value: 0,

    read() {
        if (!path)
            path = HwMon.findInput('nvme', 'Composite');
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

    /* Drives commonly report crit around 85C and throttle before it. */
    color(v) {
        return v > 75 ? '#e01b24' : (v > 65 ? '#f5a623' : null);
    },
};
