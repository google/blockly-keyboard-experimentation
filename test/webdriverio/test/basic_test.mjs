/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as chai from 'chai';
import {testSetup, testFileLocations, PAUSE_TIME} from './test_setup.mjs';
import {Key} from 'webdriverio';

suite('Keyboard navigation', function () {
  // Setting timeout to unlimited as these tests take a longer time to run than most mocha test
  this.timeout(0);

  // Setup Selenium for all of the tests
  suiteSetup(async function () {
    this.browser = await testSetup(testFileLocations.BASE);
  });

  test('Default workspace', async function () {
    const blockCount = await this.browser.execute(() => {
      return Blockly.getMainWorkspace().getAllBlocks(false).length;
    });

    chai.assert.equal(blockCount, 7);
  });

  test('Selected block', async function () {
    const workspace = await this.browser.$(
      '#blocklyDiv > div > svg.blocklySvg > g',
    );
    await workspace.click();
    await this.browser.pause(PAUSE_TIME);

    for (let i = 0; i < 9; i++) {
      await this.browser.keys(Key.ArrowDown);
      await this.browser.pause(PAUSE_TIME);
    }

    const selectedId = await this.browser.execute(() => {
      return Blockly.common.getSelected().id;
    });
    chai.assert.equal(selectedId, 'draw_circle_1');
  });
});
