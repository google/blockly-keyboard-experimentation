/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';
import * as chai from 'chai';
import {Key} from 'webdriverio';
import {
  sendKeyAndWait,
  keyDown,
  keyRight,
  PAUSE_TIME,
  tabNavigateToWorkspace,
  testFileLocations,
  testSetup,
} from './test_setup.js';

suite('Scrolling into view', function () {
  // Clear the workspace and load start blocks.
  suiteSetup(async function () {
    this.browser = await testSetup(testFileLocations.BASE);
    // Predictable small window size for scrolling.
    this.windowSize = await this.browser.getWindowSize()
    this.browser.setWindowSize(800, 600);
    await this.browser.pause(PAUSE_TIME);
  });

  suiteTeardown(async function() {
    // Restore original window size
    await this.browser.setWindowSize(this.windowSize.width, this.windowSize.height);
  });

  test('Insert scrolls new block into view', async function () {
    await tabNavigateToWorkspace(this.browser);

    // Separate the two top-level blocks by moving p5_draw_1 further down.
    await keyDown(this.browser, 3);
    await sendKeyAndWait(this.browser, 'm');
    await this.browser.keys([Key.Alt, ...new Array(25).fill(Key.ArrowDown)]);
    await sendKeyAndWait(this.browser, Key.Enter);
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
    await sendKeyAndWait(this.browser, 't');
    await keyRight(this.browser);
    await sendKeyAndWait(this.browser, Key.Enter, 2);

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
