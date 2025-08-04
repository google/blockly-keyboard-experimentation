/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A function callback used to run after an overridden stub method using
 * FunctionStubber.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StubCallback<T> = (instance: T, ...args: any) => void;

class Registration<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private oldMethod: ((...args: any) => any) | null = null;

  constructor(
    readonly callback: StubCallback<T>,
    readonly methodNameToOverride: string,
    readonly classPrototype: T,
    readonly ensureOneCall: boolean,
  ) {}

  stubPrototype(): void {
    // TODO: Figure out how to make this work with minification.
    if (this.oldMethod) {
      throw new Error(
        `Function is already stubbed: ${this.methodNameToOverride}.`,
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const genericPrototype = this.classPrototype as any;
    const oldMethod = genericPrototype[this.methodNameToOverride] as (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...args: any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) => any;
    this.oldMethod = oldMethod;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const registration = this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    genericPrototype[this.methodNameToOverride] = function (...args: any): any {
      let stubsCalled = this._internalStubsCalled as
        | {[key: string]: boolean}
        | undefined;
      if (!stubsCalled) {
        stubsCalled = {};
        this._internalStubsCalled = stubsCalled;
      }

      const result = oldMethod.call(this, ...args);
      if (
        !registration.ensureOneCall ||
        !stubsCalled[registration.methodNameToOverride]
      ) {
        registration.callback(this as unknown as T, ...args);
        stubsCalled[registration.methodNameToOverride] = true;
      }
      return result;
    };
  }
}

/**
 * Utility for augmenting a class's functionality by monkey-patching a
 * function's prototype in order to call a custom function.
 *
 * Note that all custom functions are always run after the original function
 * runs. This order cannot be configured, nor can the original function be
 * disabled.
 *
 * There are two types of overrides possible: initialization via
 * registerInitializationStub() and regular class methods via
 * registerMethodStub().
 *
 * Instances of this class should retrieved using getInstance().
 *
 * IMPORTANT: In order for stubbing to work correctly, see the caveats of
 * stubPrototypes().
 */
export class FunctionStubber {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private registrations: Array<Registration<any>> = [];
  private isFinalized = false;

  /**
   * Registers a new initialization stub.
   *
   * Initialization stub callbacks are only invoked once per instance of a given
   * object, even if that function is called multiple times. This allows for
   * methods called in a class's constructor to be used as a proxy for the
   * constructor itself.
   *
   * This will throw an error if called after stubPrototypes() has been called.
   *
   * @param callback The function to run when the stubbed method executes for
   *     the first time.
   * @param methodNameToOverride The name of the method to override.
   * @param classPrototype The prototype of the class being stubbed.
   */
  registerInitializationStub<T>(
    callback: StubCallback<T>,
    methodNameToOverride: string,
    classPrototype: T,
  ) {
    if (this.isFinalized) {
      throw new Error(
        'Cannot register a stub after initialization has been completed.',
      );
    }
    const registration = new Registration(
      callback,
      methodNameToOverride,
      classPrototype,
      true,
    );
    this.registrations.push(registration);
  }

  /**
   * Registers a new method stub.
   *
   * Method stub callbacks are invoked every time the overridden method is
   * invoked.
   *
   * This will throw an error if called after stubPrototypes() has been called.
   *
   * @param callback The function to run when the stubbed method executes.
   * @param methodNameToOverride The name of the method to override.
   * @param classPrototype The prototype of the class being stubbed.
   */
  registerMethodStub<T>(
    callback: StubCallback<T>,
    methodNameToOverride: string,
    classPrototype: T,
  ) {
    if (this.isFinalized) {
      throw new Error(
        'Cannot register a stub after initialization has been completed.',
      );
    }
    const registration = new Registration(
      callback,
      methodNameToOverride,
      classPrototype,
      false,
    );
    this.registrations.push(registration);
  }

  /**
   * Performs the actual monkey-patching to enable the custom registered
   * callbacks from registerInitializationStub() and registerMethodStub() to
   * work correctly.
   *
   * IMPORTANT: This must be called after all registration is completed, and
   * before any of the stubbed classes are actually used. This cannot be undone
   * (that is, there is no deregistration).
   */
  stubPrototypes() {
    this.isFinalized = true;
    this.registrations.forEach((registration) => registration.stubPrototype());
  }

  private static instance: FunctionStubber | null = null;

  /** Returns the page-global instance of this FunctionStubber. */
  static getInstance(): FunctionStubber {
    if (!FunctionStubber.instance) {
      FunctionStubber.instance = new FunctionStubber();
    }
    return FunctionStubber.instance;
  }
}
