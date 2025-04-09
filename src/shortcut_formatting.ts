import {ShortcutRegistry} from 'blockly';
import {keyNames} from './keynames';

const isMacPlatform = navigator.platform.startsWith('Mac');

/**
 * Format the primary shortcut for this platform in a user facing format.
 *
 * @param action The action name, e.g. "cut".
 * @returns The formatted shortcut.
 */
export function formatActionShortcut(action: string): string {
  const parts = actionShortcutsForPlatform(action)[0];
  return parts.join(' + ');
}

const modifierNames: Record<string, string> = {
  'Control': 'Ctrl',
  'Meta': '⌘ Command',
  'Alt': isMacPlatform ? '⌥ Option' : 'Alt',
};

/**
 * Find the relevant shortcuts for the given action for the current platform.
 * Keys are returned in a user facing format.
 *
 * This could be considerably simpler if we only bound shortcuts relevant to the
 * current platform or tagged them with a platform.
 *
 * @param action The action name, e.g. "cut".
 * @returns The formatted shortcuts.
 */
export function actionShortcutsForPlatform(action: string): string[][] {
  const shortcuts = ShortcutRegistry.registry.getKeyCodesByShortcutName(action);
  // See ShortcutRegistry.createSerializedKey for the starting format.
  const named = shortcuts.map((shortcut) => {
    return shortcut
      .split('+')
      .map((maybeNumeric) => keyNames[maybeNumeric] ?? maybeNumeric)
      .map((k) => upperCaseFirst(modifierNames[k] ?? k));
  });

  const command = modifierNames['Meta'];
  const option = modifierNames['Alt'];
  const control = modifierNames['Control'];
  // Needed to prefer Command to Option where we've bound Alt.
  named.sort((a, b) => {
    const aValue = a.includes(command) ? 1 : 0;
    const bValue = b.includes(command) ? 1 : 0;
    return bValue - aValue;
  });
  let currentPlatform = named.filter((shortcut) => {
    const isMacShortcut =
      shortcut.includes(command) || shortcut.includes(option);
    return isMacShortcut === isMacPlatform;
  });
  currentPlatform = currentPlatform.length === 0 ? named : currentPlatform;

  // If there are modifiers return only one shortcut on the assumption they are
  // intended for different platforms. Otherwise assume they are alternatives.
  const hasModifiers = currentPlatform.some((shortcut) =>
    shortcut.some(
      (key) => command === key || option === key || control === key,
    ),
  );
  return hasModifiers ? [currentPlatform[0]] : currentPlatform;
}

/**
 * Convert the first character to uppercase.
 *
 * @param str String.
 * @returns The string in title case.
 */
export function upperCaseFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.substring(1);
}
