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
  'doInit_',
  Blockly.BlockSvg.prototype,
);

FunctionStubber.getInstance().registerMethodStub(
  (block) => blockSvgUtils.recomputeAllWorkspaceAriaTrees(block.workspace),
  'setParent',
  Blockly.BlockSvg.prototype,
);

FunctionStubber.getInstance().registerMethodStub(
  (block) => {
    // @ts-expect-error Access to private property dragStrategy.
    const candidate = block.dragStrategy.connectionCandidate?.neighbour ?? null;
    blockSvgUtils.setCurrentConnectionCandidate(block, candidate);
    blockSvgUtils.announceDynamicAriaStateForBlock(block, true, false);
  },
  'startDrag',
  Blockly.BlockSvg.prototype,
);

FunctionStubber.getInstance().registerMethodStub(
  (block, newLoc: Blockly.utils.Coordinate) => {
    // @ts-expect-error Access to private property dragStrategy.
    const candidate = block.dragStrategy.connectionCandidate?.neighbour ?? null;
    blockSvgUtils.setCurrentConnectionCandidate(block, candidate);
    blockSvgUtils.announceDynamicAriaStateForBlock(block, true, false, newLoc);
  },
  'drag',
  Blockly.BlockSvg.prototype,
);

FunctionStubber.getInstance().registerMethodStub(
  (block) => {
    blockSvgUtils.setCurrentConnectionCandidate(block, null);
    blockSvgUtils.announceDynamicAriaStateForBlock(block, false, false);
  },
  'endDrag',
  Blockly.BlockSvg.prototype,
);

FunctionStubber.getInstance().registerMethodStub(
  (block) => {
    blockSvgUtils.announceDynamicAriaStateForBlock(block, false, true);
  },
  'revertDrag',
  Blockly.BlockSvg.prototype,
);

FunctionStubber.getInstance().registerMethodStub(
  (block) => {
    aria.setState(block.getFocusableElement(), aria.State.SELECTED, true);
  },
  'onNodeFocus',
  Blockly.BlockSvg.prototype,
);

FunctionStubber.getInstance().registerMethodStub(
  (block) => {
    aria.setState(block.getFocusableElement(), aria.State.SELECTED, false);
  },
  'onNodeBlur',
  Blockly.BlockSvg.prototype,
);
