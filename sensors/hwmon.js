/* Shared hwmon sysfs lookup, used by the temperature and fan sensors.
 *
 * /sys/class/hwmon/hwmonN numbering is not stable across boots, so chips are
 * resolved by their `name` file instead of a hardcoded index. Callers cache the
 * resolved path and drop it on a failed read so the next tick re-resolves.
 */
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

const decoder = new TextDecoder();

/* Contents of a sysfs file, trimmed, or null when unreadable. */
export function readValue(path) {
    try {
        let [ok, contents] = GLib.file_get_contents(path);
        return ok ? decoder.decode(contents).trim() : null;
    } catch (e) {
        return null;
    }
}

/* Base directory of the first hwmon chip whose name is `chip`, or null. */
export function findChip(chip) {
    let names = [];
    try {
        let dir = Gio.File.new_for_path('/sys/class/hwmon');
        let iter = dir.enumerate_children(
            'standard::name', Gio.FileQueryInfoFlags.NONE, null);
        let info;
        while ((info = iter.next_file(null)) !== null)
            names.push(info.get_name());
        iter.close(null);
    } catch (e) {
        return null;
    }
    names.sort();
    for (let entry of names) {
        let base = '/sys/class/hwmon/' + entry;
        if (readValue(base + '/name') === chip)
            return base;
    }
    return null;
}

/* Path of the `prefix`N_input whose sibling label matches `label`. A null label
 * takes input 1 directly, for chips that publish no labels at all. */
export function findInput(chip, label, prefix = 'temp') {
    let base = findChip(chip);
    if (!base)
        return null;
    if (!label)
        return `${base}/${prefix}1_input`;
    for (let i = 1; i <= 16; i++) {
        if (readValue(`${base}/${prefix}${i}_label`) === label)
            return `${base}/${prefix}${i}_input`;
    }
    return null;
}

/* Millidegrees -> whole degrees C. */
export function toCelsius(raw) {
    return Math.round(parseInt(raw, 10) / 1000);
}
