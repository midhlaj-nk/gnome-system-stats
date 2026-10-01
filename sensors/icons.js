/* Icon lookup for sensors.
 *
 * A sensor's `icon` is an icon name. Names starting with "sysov-" are the
 * symbolic SVGs bundled under icons/ (for metrics no icon theme ships);
 * anything else resolves against the user's icon theme. Both arrive as
 * symbolic icons, so St recolors them to the panel foreground and to whatever
 * `color()` returns.
 *
 * `extensionDir` is the extension's Gio.File directory (Extension.dir).
 */
import Gio from 'gi://Gio';

export function gicon(name, extensionDir) {
    if (name.startsWith('sysov-')) {
        return new Gio.FileIcon({
            file: extensionDir.get_child('icons').get_child(name + '.svg'),
        });
    }
    return new Gio.ThemedIcon({ name });
}
