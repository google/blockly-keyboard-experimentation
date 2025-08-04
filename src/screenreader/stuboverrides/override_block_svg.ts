/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionStubber} from '../function_stubber_registry';
import * as Blockly from 'blockly/core';
import * as aria from '../aria';
import * as blockSvgUtils from '../block_svg_utilities';

FunctionStubber.getInstance().registerInitializationStub(
  (block) => {
    const svgPath = block.getFocusableElement();
    aria.setState(svgPath, aria.State.ROLEDESCRIPTION, 'block');
    aria.setRole(svgPath, aria.Role.TREEITEM);
    aria.setState(
      svgPath,
      aria.State.LABEL,
      blockSvgUtils.computeBlockAriaLabel(block),
    );
    svgPath.tabIndex = -1;
    blockSvgUtils.setCurrentConnectionCandidate(block, null);
  },
  // @ts-expect-error Access to protected property doInit_.
  Blockly.BlockSvg.prototype.doInit_,
  Blockly.BlockSvg.prototype,
);

FunctionStubber.getInstance().registerMethodStub(
  (block) => blockSvgUtils.recomputeAllWorkspaceAriaTrees(block.workspace),
  Blockly.BlockSvg.prototype.setParent,
  Blockly.BlockSvg.prototype,
);

FunctionStubber.getInstance().registerMethodStub(
  (block) => {
    // @ts-expect-error Access to private property dragStrategy.
    const candidate = block.dragStrategy.connectionCandidate?.neighbour ?? null;
    blockSvgUtils.setCurrentConnectionCandidate(block, candidate);
    blockSvgUtils.announceDynamicAriaStateForBlock(block, true, false);
  },
  Blockly.BlockSvg.prototype.startDrag,
  Blockly.BlockSvg.prototype,
);

FunctionStubber.getInstance().registerMethodStub(
  (block, newLoc: Blockly.utils.Coordinate) => {
    // @ts-expect-error Access to private property dragStrategy.
    const candidate = block.dragStrategy.connectionCandidate?.neighbour ?? null;
    blockSvgUtils.setCurrentConnectionCandidate(block, candidate);
    blockSvgUtils.announceDynamicAriaStateForBlock(block, true, false, newLoc);
  },
  Blockly.BlockSvg.prototype.drag,
  Blockly.BlockSvg.prototype,
);

FunctionStubber.getInstance().registerMethodStub(
  (block) => {
    blockSvgUtils.setCurrentConnectionCandidate(block, null);
    blockSvgUtils.announceDynamicAriaStateForBlock(block, false, false);
  },
  Blockly.BlockSvg.prototype.endDrag,
  Blockly.BlockSvg.prototype,
);

FunctionStubber.getInstance().registerMethodStub(
  (block) => {
    blockSvgUtils.announceDynamicAriaStateForBlock(block, false, true);
  },
  Blockly.BlockSvg.prototype.revertDrag,
  Blockly.BlockSvg.prototype,
);

FunctionStubber.getInstance().registerMethodStub(
  (block) => {
    aria.setState(block.getFocusableElement(), aria.State.SELECTED, true);
  },
  Blockly.BlockSvg.prototype.onNodeFocus,
  Blockly.BlockSvg.prototype,
);

FunctionStubber.getInstance().registerMethodStub(
  (block) => {
    aria.setState(block.getFocusableElement(), aria.State.SELECTED, false);
  },
  Blockly.BlockSvg.prototype.onNodeBlur,
  Blockly.BlockSvg.prototype,
);
