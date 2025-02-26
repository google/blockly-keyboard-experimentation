/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';
import * as Constants from './constants';
import {ShortcutRegistry} from 'blockly/core';
// @ts-expect-error No types in js file
import {keyCodeArrayToString, toTitleCase} from './keynames';

/**
 * Class for handling the shortcuts dialog.
 */
export class ShortcutDialog {
  outputDiv: HTMLElement | null;
  modalContainer: HTMLElement | null;
  shortcutDialog: HTMLDialogElement | null;
  open: boolean;
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
      // Use built in dialog methods.
      if (this.shortcutDialog.hasAttribute('open')) {
        this.shortcutDialog.close();
      } else {
        this.shortcutDialog.showModal();
      }
    }
  }

  /**
   * @param {string} shortcutName Shortcut name to convert.
   * @returns {string}
   */
  getReadableShortcutName(shortcutName: string) {
    shortcutName = toTitleCase(shortcutName.replace(/_/gi, ' '));
    return shortcutName;
  }

  /**
   * List all currently registered shortcuts as a table.
   */
  createModalContent() {
    let modalContents = `<div class="modal-container">
      <dialog class="shortcut-modal">
        <div class="shortcut-container" tabindex="0">
          <div class="header">
            <button class="close-modal">
              <span class="material-symbols-outlined">close</span>
            </button>
            <h1>Keyboard shortcuts – <span class="platform">Windows</span></h1>
          </div>
          <div class="shortcut-tables">`;

    // Display shortcuts by their categories.
    for (const [key, categoryShortcuts] of Object.entries(
      Constants.SHORTCUT_CATEGORIES,
    )) {
      modalContents += `
        <table class="shortcut-table">
          <tbody>
          <tr class="category"><th colspan="3"><h2>${key}</h2></th></tr>
          <tr>
          `;

      for (const keyboardShortcut of categoryShortcuts) {
        const codeArray =
          ShortcutRegistry.registry.getKeyCodesByShortcutName(keyboardShortcut);
        if (codeArray.length > 0) {
          // Only show the first shortcut if there are many
          const prettyPrinted =
            codeArray.length > 2
              ? keyCodeArrayToString(codeArray.slice(0, 1))
              : keyCodeArrayToString(codeArray);

          modalContents += `
              <td>${this.getReadableShortcutName(keyboardShortcut)}</td>
              <td>${prettyPrinted}</td>
              </tr>`;
        }
      }
      modalContents += '</tr></tbody></table>';
    }
    if (this.outputDiv) {
      this.outputDiv.innerHTML =
        modalContents +
        `</div>
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
  --divider-border-color: #eee;
  --key-border-color: #ccc;
  --shortcut-modal-border-color: #9aa0a6;
}

.shortcut-modal {
  border: 1px solid var(--shortcut-modal-border-color);
  border-radius: 12px;
  box-shadow: 6px 6px 32px rgba(0,0,0,.5);
  flex-direction: column;
  gap: 12px;
  margin: auto;
  max-height: 82vh;
  max-width: calc(100% - 10em);
  padding: 24px 12px 24px 32px;
  position: relative;
  z-index: 99;
}

.shortcut-modal[open] {
  display: flex;
}

.shortcut-modal .close-modal {
  border: 0;
  background: transparent;
  float: inline-end;
  margin: 0 0 0 0;
  position: absolute;
  top: 16px;
  right: 24px;
}

.shortcut-modal h1 {
  font-weight: 600;
  font-size: 1.2em;
}

.shortcut-modal:before {
  background: radial-gradient(rgba(244, 244, 244, 0.43), rgba(75, 75, 75, 0.51));
  align-items: center;
  display: block;
  font-family: Roboto;
  height: 100%;
  justify-content: center;
  left: 0;
  position: absolute;
  top: 0;
  width: 100%;
}

.shortcut-tables {
  display: grid;
  align-items: start;
  grid-template-columns: 1fr;
  row-gap: 1em;
  column-gap: 2em;
}

@media (min-width: 950px) {
  .shortcut-tables {
    grid-template-columns: 1fr 1fr
  }
}

@media (min-width: 1360px) {
  .shortcut-tables {
    grid-template-columns: 1fr 1fr 1fr
  }
}

.shortcut-table {
  border-collapse: collapse;
  font-family: Roboto;
  font-size: .9em;
}

.shortcut-table th {
  padding-inline-end: 0.5em;
  text-align: left;
  text-wrap: nowrap;
  vertical-align: baseline;
}

.shortcut-table td:first-child {
  text-wrap: auto;
  width: 40%;
}

.shortcut-table tr:has(+ .category) {
  --divider-border-color: transparent;
  margin-end: 1em;
}

.shortcut-table tr:not(.category, :last-child) {
  border-bottom: 1px solid var(--divider-border-color);
}

.shortcut-table td {
  padding: 0.2em 1em 0.3em 0;
  text-wrap: nowrap;
}

.shortcut-table h2 {
  border-bottom: 1px solid #999;
  font-size: 1em;
  padding-block-end: 0.5em;
}

.shortcut-table .key {
  border: 1px solid var(--key-border-color);
  border-radius: 8px;
  display: inline-block;
  margin: 0 8px;
  min-width: 2em;
  padding: .3em .5em;
  text-align: center;
}

.shortcut-table .separator {
  color: gray;
  display: inline-block;
  padding: 0 0.5em;
}

.shortcut-container {
  font-size: 0.95em;
  overflow: auto;
  padding: 0.5em;
}

.shortcut-combo {
  display: inline-block;
  padding: 0.25em 0;
  text-wrap: nowrap;
}

`);
