import {FunctionStubber} from '../function_stubber_registry';
import * as Blockly from 'blockly/core';
import * as aria from '../aria';

FunctionStubber.getInstance().registerInitializationStub(
  (comment) => {
    const element = comment.getFocusableElement();
    aria.setRole(element, aria.Role.TEXTBOX);
    aria.setState(element, aria.State.LABEL, 'DoNotOverride?');
  },
  'addModelUpdateBindings',
  Blockly.comments.RenderedWorkspaceComment.prototype,
);
