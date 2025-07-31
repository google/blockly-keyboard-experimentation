export type StubCallback<T> = (instance: T, ...args: any) => void;

class Registration<T> {
  private oldMethod: ((...args: any) => any) | null = null;

  constructor(
    readonly callback: StubCallback<T>,
    readonly methodNameToOverride: string,
    readonly classPrototype: T,
    readonly ensureOneCall: boolean
  ) {}

  stubPrototype(): void {
    // TODO: Figure out how to make this work with minification.
    if (this.oldMethod) {
      throw new Error(`Function is already stubbed: ${this.methodNameToOverride}.`);
    }
    const genericPrototype = this.classPrototype as any;
    const oldMethod =
      genericPrototype[this.methodNameToOverride] as (...args: any) => any;
    this.oldMethod = oldMethod;
    const registration = this;
    genericPrototype[this.methodNameToOverride] = function (...args: any): any {
      let stubsCalled =
        this._internalStubsCalled as {[key: string]: boolean} | undefined;
      if (!stubsCalled) {
        stubsCalled = {};
        this._internalStubsCalled = stubsCalled;
      }

      const result = oldMethod.call(this, ...args);
      if (!registration.ensureOneCall || !stubsCalled[registration.methodNameToOverride]) {
        registration.callback(this as unknown as T, ...args);
        stubsCalled[registration.methodNameToOverride] = true;
      }
      return result;
    };
  }

  unstubPrototype(): void {
    if (this.oldMethod) {
      throw new Error(`Function is not currently stubbed: ${this.methodNameToOverride}.`);
    }
    const genericPrototype = this.classPrototype as any;
    genericPrototype[this.methodNameToOverride] = this.oldMethod;
    this.oldMethod = null;
  }
}

export class FunctionStubber {
  private registrations: Registration<any>[] = [];
  private isFinalized: boolean = false;

  public registerInitializationStub<T>(
    callback: StubCallback<T>,
    methodNameToOverride: string,
    classPrototype: T
  ) {
    if (this.isFinalized) {
      throw new Error('Cannot register a stub after initialization has been completed.');
    }
    const registration = new Registration(callback, methodNameToOverride, classPrototype, true);
    this.registrations.push(registration);
  }

  public registerMethodStub<T>(
    callback: StubCallback<T>,
    methodNameToOverride: string,
    classPrototype: T
  ) {
    if (this.isFinalized) {
      throw new Error('Cannot register a stub after initialization has been completed.');
    }
    const registration = new Registration(callback, methodNameToOverride, classPrototype, false);
    this.registrations.push(registration);
  }

  public stubPrototypes() {
    this.isFinalized = true;
    this.registrations.forEach((registration) => registration.stubPrototype());
  }

  public unstubPrototypes() {
    this.registrations.forEach((registration) => registration.unstubPrototype());
    this.isFinalized = false;
  }

  private static instance: FunctionStubber | null = null;

  static getInstance(): FunctionStubber {
    if (!FunctionStubber.instance) {
      FunctionStubber.instance = new FunctionStubber();
    }
    return FunctionStubber.instance;
  }
}
