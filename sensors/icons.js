/* Icon lookup for sensors.
 *
 * A sensor's `icon` is an icon name. Names starting with "sysov-" are the
 * symbolic SVGs bundled under icons/ (for metrics no icon theme ships);
 * anything else resolves against the user's icon theme. Both arrive as
 * symbolic icons, so St recolors them to the panel foreground and to whatever
 * `color()` returns.
 */
const { Gio } = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();

function gicon(name) {
    if (name.startsWith('sysov-')) {
        return new Gio.FileIcon({
            file: Me.dir.get_child('icons').get_child(name + '.svg'),
        });
    }
    return new Gio.ThemedIcon({ name });
}
