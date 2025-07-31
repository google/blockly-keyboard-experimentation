import {FunctionStubber} from '../function_stubber_registry';
import * as Blockly from 'blockly/core';
import * as aria from '../aria';

FunctionStubber.getInstance().registerInitializationStub(
  (icon) => {
    const element = icon.getFocusableElement();
    aria.setState(
      element,
      aria.State.LABEL,
      icon.bubbleIsVisible() ? 'Close Comment' : 'Open Comment',
    );
  },
  'initView',
  Blockly.icons.CommentIcon.prototype,
);
