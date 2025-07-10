/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as chai from 'chai';
import * as Blockly from 'blockly/core';
import {PAUSE_TIME, testFileLocations, testSetup} from './test_setup.js';

suite('HTML toasts', function () {
  // Clear the workspace and load start blocks.
  setup(async function () {
    this.browser = await testSetup(testFileLocations.BASE);
    await this.browser.pause(PAUSE_TIME);
  });

  test('Can be displayed', async function () {
    const equal = await this.browser.execute(() => {
      const element = document.createElement('div');
      element.id = 'testToast';
      element.innerHTML = 'This is a <b>test</b>';

      const options = {
        element,
        message: 'Placeholder',
      };
      Blockly.dialog.toast(
        Blockly.getMainWorkspace() as Blockly.WorkspaceSvg,
        options,
      );

      // Ensure that the element displayed in the toast is the one we specified.
      return document.querySelector('.blocklyToast #testToast') === element;
    });

    chai.assert.isTrue(equal);
  });
});
