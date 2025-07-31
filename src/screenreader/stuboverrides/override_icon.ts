import {FunctionStubber} from '../function_stubber_registry';
import * as Blockly from 'blockly/core';
import * as aria from '../aria';

FunctionStubber.getInstance().registerInitializationStub((icon) => {
  const element = icon.getFocusableElement();
  aria.setRole(element, aria.Role.FIGURE);
  aria.setState(element, aria.State.LABEL, 'Icon');
}, 'initView', Blockly.icons.Icon.prototype);
