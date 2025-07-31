import {FunctionStubber} from '../function_stubber_registry';
import * as Blockly from 'blockly/core';
import * as aria from '../aria';
import * as blockSvgUtils from '../block_svg_utilities';

FunctionStubber.getInstance().registerInitializationStub((block) => {
  const svgPath = block.getFocusableElement();
  aria.setState(svgPath, aria.State.ROLEDESCRIPTION, 'block');
  aria.setRole(svgPath, aria.Role.TREEITEM);
  aria.setState(svgPath, aria.State.LABEL, blockSvgUtils.computeBlockAriaLabel(block));
  svgPath.tabIndex = -1;
  (block as any).currentConnectionCandidate = null;
}, 'doInit_', Blockly.BlockSvg.prototype);

FunctionStubber.getInstance().registerMethodStub((block) => {
  block.workspace
    .getTopBlocks(false)
    .forEach((block) => blockSvgUtils.recomputeAriaTreeItemDetailsRecursively(block));
}, 'setParent', Blockly.BlockSvg.prototype);

FunctionStubber.getInstance().registerMethodStub((block) => {
  (block as any).currentConnectionCandidate =
  // @ts-expect-error Access to private property dragStrategy.
  block.dragStrategy.connectionCandidate?.neighbour ?? null;
  blockSvgUtils.announceDynamicAriaStateForBlock(block, true, false);
}, 'startDrag', Blockly.BlockSvg.prototype);

FunctionStubber.getInstance().registerMethodStub((block, newLoc: Blockly.utils.Coordinate) => {
  (block as any).currentConnectionCandidate =
  // @ts-expect-error Access to private property dragStrategy.
  block.dragStrategy.connectionCandidate?.neighbour ?? null;
  blockSvgUtils.announceDynamicAriaStateForBlock(block, true, false, newLoc);
}, 'drag', Blockly.BlockSvg.prototype);

FunctionStubber.getInstance().registerMethodStub((block) => {
  (block as any).currentConnectionCandidate = null;
  blockSvgUtils.announceDynamicAriaStateForBlock(block, false, false);
}, 'endDrag', Blockly.BlockSvg.prototype);

FunctionStubber.getInstance().registerMethodStub((block) => {
  blockSvgUtils.announceDynamicAriaStateForBlock(block, false, true);
}, 'revertDrag', Blockly.BlockSvg.prototype);

FunctionStubber.getInstance().registerMethodStub((block) => {
  aria.setState(block.getFocusableElement(), aria.State.SELECTED, true);
}, 'onNodeFocus', Blockly.BlockSvg.prototype);

FunctionStubber.getInstance().registerMethodStub((block) => {
  aria.setState(block.getFocusableElement(), aria.State.SELECTED, false);
}, 'onNodeBlur', Blockly.BlockSvg.prototype);
