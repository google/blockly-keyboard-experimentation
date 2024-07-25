/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ShortcutRegistry} from 'blockly';
import {keyCodeArrayToString} from './keynames';

/**
 * Class for surfacing information about keyboard navigation state.
 */
export class Announcer {
  /**
   * Constructor for an Announcer.
   */
  constructor() {
    // For testing purposes, this assumes that the page has a
    // div named 'announcer'.
    this.outputDiv = document.getElementById('announcer');
  }

  /**
   * List all currently registered shortcuts as a table.
   */
  listShortcuts() {
    const registry = ShortcutRegistry.registry.getRegistry();
    let text = `<table>
    <thead>
    <tr>
    <td>Shortcut name</td>
    <td>Shortcut action</td>
    </tr>
    </thead>`;
    for (const keyboardShortcut of Object.keys(registry)) {
      const codeArray =
        ShortcutRegistry.registry.getKeyCodesByShortcutName(keyboardShortcut);
      const prettyPrinted = keyCodeArrayToString(codeArray);
      text += `<tr><td>${keyboardShortcut}</td> <td>${prettyPrinted}</td></tr>`;
    }
    this.outputDiv.innerHTML = text + '\n</table/>';
  }

  /**
   * Set the text of the output div, with no validation.
   * @param {string} text The text to display.
   */
  setText(text) {
    this.outputDiv.innerHTML = text;
  }
}
