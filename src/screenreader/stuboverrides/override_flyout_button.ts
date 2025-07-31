import {FunctionStubber} from '../function_stubber_registry';
import * as Blockly from 'blockly/core';
import * as aria from '../aria';

FunctionStubber.getInstance().registerInitializationStub((flyoutButton) => {
  const element = flyoutButton.getFocusableElement();
  aria.setRole(element, aria.Role.BUTTON);
  aria.setState(element, aria.State.LABEL, 'Button');
}, 'updateTransform', Blockly.FlyoutButton.prototype);
