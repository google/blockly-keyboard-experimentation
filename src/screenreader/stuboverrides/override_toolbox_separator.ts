import {FunctionStubber} from '../function_stubber_registry';
import * as Blockly from 'blockly/core';
import * as aria from '../aria';
import * as toolboxUtils from '../toolbox_utilities';

FunctionStubber.getInstance().registerInitializationStub((separator) => {
  aria.setRole(separator.getFocusableElement(), aria.Role.SEPARATOR);
  toolboxUtils.recomputeAriaOwnersInToolbox(separator.getFocusableTree() as Blockly.Toolbox);
}, 'init', Blockly.ToolboxSeparator.prototype);
