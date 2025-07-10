/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';
import * as chai from 'chai';
import {Key} from 'webdriverio';
import {
  keyDown,
  keyRight,
  PAUSE_TIME,
  tabNavigateToWorkspace,
  testFileLocations,
  testSetup,
} from './test_setup.js';

suite('Scrolling into view', function () {
  // Setting timeout to unlimited as these tests take longer time to run
  this.timeout(0);

  // Resize browser to provide predictable small window size for scrolling.
  //
  // N.B. that this is called only one per suite, not once per test.
  suiteSetup(async function () {
    this.browser = await testSetup(testFileLocations.BASE);
    this.windowSize = await this.browser.getWindowSize();
    await this.browser.setWindowSize(800, 600);
    await this.browser.pause(PAUSE_TIME);
  });

  // Restore original browser window size.
  suiteTeardown(async function () {
    await this.browser.setWindowSize(
      this.windowSize.width,
      this.windowSize.height,
    );
  });

  // Clear the workspace and load start blocks.
  setup(async function () {
    await testSetup(testFileLocations.BASE);
  });

  test('Insert scrolls new block into view', async function () {
    await tabNavigateToWorkspace(this.browser);

    // Separate the two top-level blocks by moving p5_draw_1 further down.
    await keyDown(this.browser, 3);
    await this.browser.keys('m');
    await this.browser.keys([Key.Alt, ...new Array(25).fill(Key.ArrowDown)]);
    await this.browser.keys(Key.Enter);
    // Scroll back up, leaving cursor on the draw block out of the viewport.
    await this.browser.execute(() => {
      const workspace = Blockly.getMainWorkspace() as Blockly.WorkspaceSvg;
      workspace.scrollBoundsIntoView(
        (
          workspace.getTopBlocks(true)[0] as Blockly.BlockSvg
        ).getBoundingRectangleWithoutChildren(),
      );
    });

    // Insert and confirm the test block which should be scrolled into view.
    await this.browser.keys('t');
    await keyRight(this.browser);
    await this.browser.keys(Key.Enter);
    await this.browser.keys(Key.Enter);

    // Assert new block has been scrolled into the viewport.
    await this.browser.pause(PAUSE_TIME);
    const inViewport = await this.browser.execute(() => {
      const workspace = Blockly.getMainWorkspace() as Blockly.WorkspaceSvg;
      const block = workspace.getBlocksByType(
        'controls_if',
      )[0] as Blockly.BlockSvg;
      const blockBounds = block.getBoundingRectangleWithoutChildren();
      const rawViewport = workspace.getMetricsManager().getViewMetrics(true);
      const viewport = new Blockly.utils.Rect(
        rawViewport.top,
        rawViewport.top + rawViewport.height,
        rawViewport.left,
        rawViewport.left + rawViewport.width,
      );
      return viewport.contains(blockBounds.left, blockBounds.top);
    });
    chai.assert.isTrue(inViewport);
  });
});
