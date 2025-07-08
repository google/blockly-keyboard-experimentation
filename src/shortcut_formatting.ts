import {ShortcutRegistry, Msg} from 'blockly';
import {keyNames} from './keynames';

const isMacPlatform = navigator.platform.startsWith('Mac');

/**
 * Returns an HTML menu item with a label and grey keyboard shortcut.
 *
 * @param labelText The text of the mneu item.
 * @param action The identifier of an action to use the keyboard shortcut of.
 * @returns A nicely formatted menu item.
 */
export function getMenuItem(labelText: string, action: string): HTMLElement {
  // TODO: Once core is updated to remove the shortcut placeholders from the
  // keyboard shortcut messages, remove this.
  if (labelText.indexOf(')') === labelText.length - 1) {
    labelText = labelText.split(' (')[0];
  }
  const container = document.createElement('div');
  container.className = 'blocklyShortcutContainer';
  const label = document.createElement('span');
  label.textContent = labelText;
  const shortcut = document.createElement('span');
  shortcut.className = 'blocklyShortcut';
  shortcut.textContent = ` ${getShortActionShortcut(action)}`;
  container.appendChild(label);
  container.appendChild(shortcut);
  return container;
}

/**
 * Find the primary shortcut for this platform and return it as single string
 * in a short user facing format.
 *
 * @param action The action name, e.g. "cut".
 * @returns The formatted shortcut.
 */
export function getShortActionShortcut(action: string): string {
  const parts = getActionShortcutsAsKeys(action, shortModifierNames)[0];
  return parts.join(isMacPlatform ? ' ' : ' + ');
}

/**
 * Find the relevant shortcuts for the given action for the current platform.
 * Keys are returned in a long user facing format.
 *
 * @param action The action name, e.g. "cut".
 * @returns The formatted shortcuts as individual keys.
 */
export function getLongActionShortcutsAsKeys(action: string): string[][] {
  return getActionShortcutsAsKeys(action, longModifierNames);
}

const longModifierNames: Record<string, string> = {
  'Control': Msg['CONTROL_KEY'],
  'Meta': Msg['COMMAND_KEY'],
  'Alt': isMacPlatform ? Msg['OPTION_KEY'] : Msg['ALT_KEY'],
};

const shortModifierNames: Record<string, string> = {
  'Control': Msg['CONTROL_KEY'],
  'Meta': '⌘',
  'Alt': isMacPlatform ? '⌥' : Msg['ALT_KEY'],
};

/**
 * Find the relevant shortcuts for the given action for the current platform.
 * Keys are returned in a user facing format.
 *
 * This could be considerably simpler if we only bound shortcuts relevant to the
 * current platform or tagged them with a platform.
 *
 * @param action The action name, e.g. "cut".
 * @param modifierNames The names to use for the Meta/Control/Alt modifiers.
 * @returns The formatted shortcuts.
 */
function getActionShortcutsAsKeys(
  action: string,
  modifierNames: Record<string, string>,
): string[][] {
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
