/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';
import * as Constants from './constants';
import {ShortcutRegistry} from 'blockly/core';
// @ts-expect-error No types in js file
import {keyCodeArrayToString} from './keynames';

/**
 * Class for handling the shortcuts dialog.
 */
export class ShortcutDialog {
  outputDiv: HTMLElement | null;
  modalContainer: HTMLElement | null;
  shortcutDialog: HTMLElement | null;
  open: Boolean;
  closeButton: HTMLElement | null;
  /**
   * Constructor for an Announcer.
   */
  constructor() {
    // For testing purposes, this assumes that the page has a
    // div named 'shortcuts'.
    this.outputDiv = document.getElementById('shortcuts');

    this.open = false;
    this.modalContainer = null;
    this.shortcutDialog = null;
    this.closeButton = null;
  }

  getPlatform() {
    const platform = navigator.platform;

    // Check for Windows platforms
    if (platform.startsWith('Win')) {
      return 'Windows';
    } else if (platform.startsWith('Mac')) {
      return 'macOS';
    } else if (platform.includes('Linux')) {
      return 'Linux';
    } else if (platform.includes('chromeOS')) {
      return 'ChromeOS';
    } else {
      return 'Unknown';
    }
  }

  /**
   * Update the modifier key to the user's specific platform.
   */
  updatePlatformModifier() {
    const platform = this.getPlatform();
    const platformEl = this.outputDiv
      ? this.outputDiv.querySelector('.platform')
      : null;

    // Update platform string
    if (platformEl) {
      platformEl.textContent = platform;
    }

    if (this.shortcutDialog) {
      const modifierKeys =
        this.shortcutDialog.querySelectorAll('.key.modifier');

      if (modifierKeys.length > 0 && platform) {
        for (let key of modifierKeys) {
          key.textContent =
            Constants.MODIFIER_KEY[
              platform as keyof typeof Constants.MODIFIER_KEY
            ];
        }
      }
    }
  }

  toggle() {
    if (this.modalContainer && this.shortcutDialog) {
      this.modalContainer.classList.toggle('open', !this.open);
      if (this.open) {
        this.shortcutDialog.removeAttribute('open');
      } else {
        this.shortcutDialog.setAttribute('open', '');
      }
      this.open = !this.open;
    }
  }

  /**
   * @param {string} shortcutName Shortcut name to convert.
   * @returns {string}
   */
  getReadableShortcutName(shortcutName: string) {
    shortcutName = shortcutName.replace(/_/gi, ' ');
    return shortcutName;
  }

  /**
   * List all currently registered shortcuts as a table.
   */
  createModalContent() {
    const registry = ShortcutRegistry.registry.getRegistry();

    let modalContents = `<div class="modal-container">
  <dialog class="shortcut-modal">
    <div class="shortcut-container">
    <div class="header">
      <button class="close-modal">
        <span class="material-symbols-outlined">close</span>
      </button>
      <h1>Keyboard shortcuts</h1>
      <p class="intro">
        <span class="platform">Windows</span>
      </p>
    </div>
    <div class="shortcut-container">
      <table class="shortcuts">
        <tbody>
          <thead>
            <tr class="category">
              <th colspan="2">General</th>
            </tr>
          </thead>
    `;

    for (const keyboardShortcut of Object.keys(registry)) {
      const codeArray =
        ShortcutRegistry.registry.getKeyCodesByShortcutName(keyboardShortcut);
      const prettyPrinted = keyCodeArrayToString(codeArray);
      modalContents += `<tr>
          <td>${this.getReadableShortcutName(keyboardShortcut)}</td>
          <td>${prettyPrinted}</td>
         </tr>`;
    }

    if (this.outputDiv) {
      this.outputDiv.innerHTML =
        modalContents +
        `\n</tbody>
          </table>
        </div>
      </dialog>
    </div>`;
      this.modalContainer = this.outputDiv.querySelector('.modal-container');
      this.shortcutDialog = this.outputDiv.querySelector('.shortcut-modal');
      this.closeButton = this.outputDiv.querySelector('.close-modal');
      this.updatePlatformModifier();
      // Can we also intercept the Esc key to dismiss.
      if (this.closeButton) {
        this.closeButton.addEventListener('click', (e) => {
          this.toggle();
        });
      }
    }
  }
}

/**
 * Register classes used by the shortcuts modal
 * Alt: plugin exports a register() function that updates the registry
 **/
Blockly.Css.register(`
:root {
  --divider-border-color: #DADCE0;
  --key-border-color: #BDC1C6;
  --shortcut-modal-border-color: #9AA0A6;
}

.modal-container {
  align-items: center;
  display: none;
  font-family: Roboto;
  height: 100%;
  justify-content: center;
  left: 0;
  position: absolute;
  top: 0;
  width: 100%;
}

.shortcut-modal {
  border: 1px solid var(--shortcut-modal-border-color);
  border-radius: 12px;
  box-shadow: 6px 6px 32px  rgba(0,0,0,.5);
  flex-direction: column;
  gap: 12px;
  margin: auto;
  max-height: 82vh;
  max-width: 800px;
  min-width: 300px;
  padding: 24px 12px 24px 32px;
  position: relative;
  width: 70%;
  z-index: 99;
}

.modal-container.open,
.shortcut-modal[open] {
  display: flex;
}

.modal-container .close-modal {
  border: 0;
  background: transparent;
  float: inline-end;
  margin: 0 0 0 0;
  position: absolute;
  top: 16px;
  right: 24px;
}

.modal-container h1 {
  font-weight: 600;
  font-size: 1.5em;
}

.modal-container {
  background: radial-gradient(rgba(244, 244, 244, 0.43), rgba(75, 75, 75, 0.51));
}

.shortcuts {
  width: 100%;
  font-family: Roboto;
  border-collapse: collapse;
  font-size: .9em;
}

.shortcuts th {
  text-align: left;
  padding: 1em 0 0.5em;
}

.key {
  border-radius: 8px;
  border: 1px solid var(--key-border-color);
  display: inline-block;
  margin: 0 8px;
  min-width: 2em;
  padding: .2em .5em;
  text-align: center;
}

tr:not(.category, :last-child) {
  border-bottom: 1px solid var(--divider-border-color);
}

td {
  padding: .5em 0 .6em;
}

.shortcut-container {
  overflow: auto;
}

.shortcuts .separator {
  display: inline-block;
  padding: 0 1em
}

.shortcut-combo {
  text-wrap: nowrap;
  display: inline-block;
  padding: 0.25em 0;
}

.shortcuts tr td:first-child {
  text-transform: capitalize;
}

`);
