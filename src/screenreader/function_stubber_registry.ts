export type StubCallback<T> = (instance: T, ...args: any) => void;

class Registration<T> {
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
    const genericPrototype = this.classPrototype as any;
    const oldMethod = genericPrototype[this.methodNameToOverride] as (
      ...args: any
    ) => any;
    this.oldMethod = oldMethod;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const registration = this;
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

export class FunctionStubber {
  private registrations: Array<Registration<any>> = [];
  private isFinalized = false;

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

  stubPrototypes() {
    this.isFinalized = true;
    this.registrations.forEach((registration) => registration.stubPrototype());
  }

  private static instance: FunctionStubber | null = null;

  static getInstance(): FunctionStubber {
    if (!FunctionStubber.instance) {
      FunctionStubber.instance = new FunctionStubber();
    }
    return FunctionStubber.instance;
  }
}
