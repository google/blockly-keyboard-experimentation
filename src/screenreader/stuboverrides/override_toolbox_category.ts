import {FunctionStubber} from '../function_stubber_registry';
import * as Blockly from 'blockly/core';
import * as aria from '../aria';
import * as toolboxUtils from '../toolbox_utilities';

// TODO: Reimplement selected for items and expanded for categories, and levels.
FunctionStubber.getInstance().registerInitializationStub(
  (category) => {
    aria.setRole(category.getFocusableElement(), aria.Role.TREEITEM);
    toolboxUtils.recomputeAriaOwnersInToolbox(
      category.getFocusableTree() as Blockly.Toolbox,
    );
  },
  'init',
  Blockly.ToolboxCategory.prototype,
);
