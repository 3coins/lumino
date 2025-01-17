// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2017, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
import { expect } from 'chai';

import { Signal, Stream } from '@lumino/signaling';

class TestObject {
  readonly one = new Signal<this, void>(this);

  readonly two = new Signal<this, number>(this);

  readonly three = new Stream<this, string[]>(this);
}

class ExtendedObject extends TestObject {
  notifyCount = 0;

  onNotify(): void {
    this.notifyCount++;
  }
}

class TestHandler {
  name = '';

  oneCount = 0;

  twoValue = 0;

  twoSender: TestObject | null = null;

  onOne(): void {
    this.oneCount++;
  }

  onTwo(sender: TestObject, args: number): void {
    this.twoSender = sender;
    this.twoValue = args;
  }

  onThree(sender: TestObject, args: string[]): void {
    args.push(this.name);
  }

  onThrow(): void {
    throw new Error();
  }
}

describe('@lumino/signaling', () => {
  describe('Signal', () => {
    describe('#sender', () => {
      it('should be the sender of the signal', () => {
        let obj = new TestObject();
        expect(obj.one.sender).to.equal(obj);
        expect(obj.two.sender).to.equal(obj);
        expect(obj.three.sender).to.equal(obj);
      });
    });

    describe('#block()', () => {
      it('should block the signal emission', () => {
        let obj = new TestObject();
        let handler1 = new TestHandler();
        let handler2 = new TestHandler();
        obj.two.connect(handler1.onTwo, handler1);
        obj.two.connect(handler2.onTwo, handler2);

        obj.two.block(() => {
          obj.two.emit(4);
        });

        expect(handler1.twoSender).to.equal(null);
        expect(handler2.twoSender).to.equal(null);
        expect(handler1.twoValue).to.equal(0);
        expect(handler2.twoValue).to.equal(0);

        obj.two.emit(15);
        expect(handler1.twoSender).to.equal(obj);
        expect(handler2.twoSender).to.equal(obj);
        expect(handler1.twoValue).to.equal(15);
        expect(handler2.twoValue).to.equal(15);
      });

      it('should block the signal emission for nested loop', () => {
        let obj = new TestObject();
        let handler1 = new TestHandler();
        let handler2 = new TestHandler();
        obj.two.connect(handler1.onTwo, handler1);
        obj.two.connect(handler2.onTwo, handler2);

        obj.two.block(() => {
          obj.two.emit(4);
          obj.two.block(() => {
            obj.two.emit(42);
          });
          obj.two.emit(6);
        });

        expect(handler1.twoSender).to.equal(null);
        expect(handler2.twoSender).to.equal(null);
        expect(handler1.twoValue).to.equal(0);
        expect(handler2.twoValue).to.equal(0);

        obj.two.emit(15);
        expect(handler1.twoSender).to.equal(obj);
        expect(handler2.twoSender).to.equal(obj);
        expect(handler1.twoValue).to.equal(15);
        expect(handler2.twoValue).to.equal(15);
      });
    });

    describe('#connect()', () => {
      it('should return true on success', () => {
        let obj = new TestObject();
        let handler = new TestHandler();
        let c1 = obj.one.connect(handler.onOne, handler);
        expect(c1).to.equal(true);
      });

      it('should return false on failure', () => {
        let obj = new TestObject();
        let handler = new TestHandler();
        let c1 = obj.one.connect(handler.onOne, handler);
        let c2 = obj.one.connect(handler.onOne, handler);
        expect(c1).to.equal(true);
        expect(c2).to.equal(false);
      });

      it('should connect plain functions', () => {
        let obj = new TestObject();
        let handler = new TestHandler();
        let c1 = obj.one.connect(handler.onThrow);
        expect(c1).to.equal(true);
      });

      it('should ignore duplicate connections', () => {
        let obj = new TestObject();
        let handler = new TestHandler();
        let c1 = obj.one.connect(handler.onOne, handler);
        let c2 = obj.one.connect(handler.onOne, handler);
        let c3 = obj.two.connect(handler.onTwo, handler);
        let c4 = obj.two.connect(handler.onTwo, handler);
        obj.one.emit(undefined);
        obj.two.emit(42);
        expect(c1).to.equal(true);
        expect(c2).to.equal(false);
        expect(c3).to.equal(true);
        expect(c4).to.equal(false);
        expect(handler.oneCount).to.equal(1);
        expect(handler.twoValue).to.equal(42);
      });

      it('should handle connect after disconnect and emit', () => {
        let obj = new TestObject();
        let handler = new TestHandler();
        let c1 = obj.one.connect(handler.onOne, handler);
        expect(c1).to.equal(true);
        obj.one.disconnect(handler.onOne, handler);
        obj.one.emit(undefined);
        let c2 = obj.one.connect(handler.onOne, handler);
        expect(c2).to.equal(true);
      });
    });

    describe('#disconnect()', () => {
      it('should return true on success', () => {
        let obj = new TestObject();
        let handler = new TestHandler();
        obj.one.connect(handler.onOne, handler);
        let d1 = obj.one.disconnect(handler.onOne, handler);
        expect(d1).to.equal(true);
      });

      it('should return false on failure', () => {
        let obj = new TestObject();
        let handler = new TestHandler();
        let d1 = obj.one.disconnect(handler.onOne, handler);
        expect(d1).to.equal(false);
      });

      it('should disconnect plain functions', () => {
        let obj = new TestObject();
        let handler = new TestHandler();
        obj.one.connect(handler.onThrow);
        expect(obj.one.disconnect(handler.onThrow)).to.equal(true);
        expect(() => obj.one.emit(undefined)).to.not.throw(Error);
      });

      it('should disconnect a specific signal', () => {
        let obj1 = new TestObject();
        let obj2 = new TestObject();
        let obj3 = new TestObject();
        let handler1 = new TestHandler();
        let handler2 = new TestHandler();
        let handler3 = new TestHandler();
        obj1.one.connect(handler1.onOne, handler1);
        obj2.one.connect(handler2.onOne, handler2);
        obj1.one.connect(handler3.onOne, handler3);
        obj2.one.connect(handler3.onOne, handler3);
        obj3.one.connect(handler3.onOne, handler3);
        let d1 = obj1.one.disconnect(handler1.onOne, handler1);
        let d2 = obj1.one.disconnect(handler1.onOne, handler1);
        let d3 = obj2.one.disconnect(handler3.onOne, handler3);
        obj1.one.emit(undefined);
        obj2.one.emit(undefined);
        obj3.one.emit(undefined);
        expect(d1).to.equal(true);
        expect(d2).to.equal(false);
        expect(d3).to.equal(true);
        expect(handler1.oneCount).to.equal(0);
        expect(handler2.oneCount).to.equal(1);
        expect(handler3.oneCount).to.equal(2);
      });

      it('should handle disconnecting sender after receiver', () => {
        let obj = new TestObject();
        let handler = new TestHandler();
        obj.one.connect(handler.onOne, handler);
        Signal.disconnectReceiver(handler);
        Signal.disconnectSender(obj);
        obj.one.emit(undefined);
        expect(handler.oneCount).to.equal(0);
      });

      it('should handle disconnecting receiver after sender', () => {
        let obj = new TestObject();
        let handler = new TestHandler();
        obj.one.connect(handler.onOne, handler);
        Signal.disconnectSender(obj);
        Signal.disconnectReceiver(handler);
        obj.one.emit(undefined);
        expect(handler.oneCount).to.equal(0);
      });
    });

    describe('#emit()', () => {
      it('should be a no-op if there are no connection', () => {
        let obj = new TestObject();
        expect(() => {
          obj.one.emit(undefined);
        }).to.not.throw(Error);
      });

      it('should pass the sender and args to the handlers', () => {
        let obj = new TestObject();
        let handler1 = new TestHandler();
        let handler2 = new TestHandler();
        obj.two.connect(handler1.onTwo, handler1);
        obj.two.connect(handler2.onTwo, handler2);
        obj.two.emit(15);
        expect(handler1.twoSender).to.equal(obj);
        expect(handler2.twoSender).to.equal(obj);
        expect(handler1.twoValue).to.equal(15);
        expect(handler2.twoValue).to.equal(15);
      });

      it('should invoke handlers in connection order', () => {
        let obj = new TestObject();
        let handler1 = new TestHandler();
        let handler2 = new TestHandler();
        let handler3 = new TestHandler();
        handler1.name = 'foo';
        handler2.name = 'bar';
        handler3.name = 'baz';
        obj.three.connect(handler1.onThree, handler1);
        obj.one.connect(handler1.onOne, handler1);
        obj.three.connect(handler2.onThree, handler2);
        obj.three.connect(handler3.onThree, handler3);
        let names: string[] = [];
        obj.three.emit(names);
        obj.one.emit(undefined);
        expect(names).to.deep.equal(['foo', 'bar', 'baz']);
        expect(handler1.oneCount).to.equal(1);
        expect(handler2.oneCount).to.equal(0);
      });

      it('should catch any exceptions in handlers', () => {
        let obj = new TestObject();
        let handler1 = new TestHandler();
        let handler2 = new TestHandler();
        let handler3 = new TestHandler();
        handler1.name = 'foo';
        handler2.name = 'bar';
        handler3.name = 'baz';
        obj.three.connect(handler1.onThree, handler1);
        obj.three.connect(handler2.onThrow, handler2);
        obj.three.connect(handler3.onThree, handler3);
        let threw = false;
        let names1: string[] = [];
        try {
          obj.three.emit(names1);
        } catch (e) {
          threw = true;
        }
        expect(threw).to.equal(false);
        expect(names1).to.deep.equal(['foo', 'baz']);
      });

      it('should not invoke signals added during emission', () => {
        let obj = new TestObject();
        let handler1 = new TestHandler();
        let handler2 = new TestHandler();
        let handler3 = new TestHandler();
        handler1.name = 'foo';
        handler2.name = 'bar';
        handler3.name = 'baz';
        let adder = {
          add: () => {
            obj.three.connect(handler3.onThree, handler3);
          }
        };
        obj.three.connect(handler1.onThree, handler1);
        obj.three.connect(handler2.onThree, handler2);
        obj.three.connect(adder.add, adder);
        let names1: string[] = [];
        obj.three.emit(names1);
        obj.three.disconnect(adder.add, adder);
        let names2: string[] = [];
        obj.three.emit(names2);
        expect(names1).to.deep.equal(['foo', 'bar']);
        expect(names2).to.deep.equal(['foo', 'bar', 'baz']);
      });

      it('should not invoke signals removed during emission', () => {
        let obj = new TestObject();
        let handler1 = new TestHandler();
        let handler2 = new TestHandler();
        let handler3 = new TestHandler();
        handler1.name = 'foo';
        handler2.name = 'bar';
        handler3.name = 'baz';
        let remover = {
          remove: () => {
            obj.three.disconnect(handler3.onThree, handler3);
          }
        };
        obj.three.connect(handler1.onThree, handler1);
        obj.three.connect(handler2.onThree, handler2);
        obj.three.connect(remover.remove, remover);
        obj.three.connect(handler3.onThree, handler3);
        let names: string[] = [];
        obj.three.emit(names);
        expect(names).to.deep.equal(['foo', 'bar']);
      });
    });

    describe('.blockAll()', () => {
      it('should block all signals from a given sender', () => {
        let obj = new TestObject();
        let handler1 = new TestHandler();
        let handler2 = new TestHandler();
        obj.one.connect(handler1.onOne, handler1);
        obj.one.connect(handler2.onOne, handler2);
        obj.two.connect(handler1.onTwo, handler1);
        obj.two.connect(handler2.onTwo, handler2);

        Signal.blockAll(obj, () => {
          obj.one.emit(undefined);
          obj.two.emit(42);
        });
        expect(handler1.oneCount).to.equal(0);
        expect(handler2.oneCount).to.equal(0);
        expect(handler1.twoValue).to.equal(0);
        expect(handler2.twoValue).to.equal(0);

        obj.one.emit(undefined);
        obj.two.emit(42);
        expect(handler1.oneCount).to.equal(1);
        expect(handler2.oneCount).to.equal(1);
        expect(handler1.twoValue).to.equal(42);
        expect(handler2.twoValue).to.equal(42);
      });

      it('should block all signals from a given sender for nested loop', () => {
        let obj = new TestObject();
        let handler1 = new TestHandler();
        let handler2 = new TestHandler();
        obj.one.connect(handler1.onOne, handler1);
        obj.one.connect(handler2.onOne, handler2);
        obj.two.connect(handler1.onTwo, handler1);
        obj.two.connect(handler2.onTwo, handler2);

        Signal.blockAll(obj, () => {
          obj.one.emit(undefined);
          obj.two.emit(4);

          Signal.blockAll(obj, () => {
            obj.one.emit(undefined);
            obj.two.emit(12);
          });

          obj.one.emit(undefined);
          obj.two.emit(6);
        });

        expect(handler1.oneCount).to.equal(0);
        expect(handler2.oneCount).to.equal(0);
        expect(handler1.twoValue).to.equal(0);
        expect(handler2.twoValue).to.equal(0);

        obj.one.emit(undefined);
        obj.two.emit(42);
        expect(handler1.oneCount).to.equal(1);
        expect(handler2.oneCount).to.equal(1);
        expect(handler1.twoValue).to.equal(42);
        expect(handler2.twoValue).to.equal(42);
      });
    });

    describe('.disconnectBetween()', () => {
      it('should clear all connections between a sender and receiver', () => {
        let obj = new TestObject();
        let handler1 = new TestHandler();
        let handler2 = new TestHandler();
        obj.one.connect(handler1.onOne, handler1);
        obj.one.connect(handler2.onOne, handler2);
        obj.two.connect(handler1.onTwo, handler1);
        obj.two.connect(handler2.onTwo, handler2);
        obj.one.emit(undefined);
        expect(handler1.oneCount).to.equal(1);
        expect(handler2.oneCount).to.equal(1);
        obj.two.emit(42);
        expect(handler1.twoValue).to.equal(42);
        expect(handler2.twoValue).to.equal(42);
        Signal.disconnectBetween(obj, handler1);
        obj.one.emit(undefined);
        expect(handler1.oneCount).to.equal(1);
        expect(handler2.oneCount).to.equal(2);
        obj.two.emit(7);
        expect(handler1.twoValue).to.equal(42);
        expect(handler2.twoValue).to.equal(7);
      });

      it('should be a no-op if the sender or receiver is not connected', () => {
        expect(() => Signal.disconnectBetween({}, {})).to.not.throw(Error);
      });
    });

    describe('.disconnectSender()', () => {
      it('should disconnect all signals from a specific sender', () => {
        let obj1 = new TestObject();
        let obj2 = new TestObject();
        let handler1 = new TestHandler();
        let handler2 = new TestHandler();
        obj1.one.connect(handler1.onOne, handler1);
        obj1.one.connect(handler2.onOne, handler2);
        obj2.one.connect(handler1.onOne, handler1);
        obj2.one.connect(handler2.onOne, handler2);
        Signal.disconnectSender(obj1);
        obj1.one.emit(undefined);
        obj2.one.emit(undefined);
        expect(handler1.oneCount).to.equal(1);
        expect(handler2.oneCount).to.equal(1);
      });

      it('should be a no-op if the sender is not connected', () => {
        expect(() => Signal.disconnectSender({})).to.not.throw(Error);
      });
    });

    describe('.disconnectReceiver()', () => {
      it('should disconnect all signals from a specific receiver', () => {
        let obj1 = new TestObject();
        let obj2 = new TestObject();
        let handler1 = new TestHandler();
        let handler2 = new TestHandler();
        obj1.one.connect(handler1.onOne, handler1);
        obj1.one.connect(handler2.onOne, handler2);
        obj2.one.connect(handler1.onOne, handler1);
        obj2.one.connect(handler2.onOne, handler2);
        obj2.two.connect(handler1.onTwo, handler1);
        obj2.two.connect(handler2.onTwo, handler2);
        Signal.disconnectReceiver(handler1);
        obj1.one.emit(undefined);
        obj2.one.emit(undefined);
        obj2.two.emit(42);
        expect(handler1.oneCount).to.equal(0);
        expect(handler2.oneCount).to.equal(2);
        expect(handler1.twoValue).to.equal(0);
        expect(handler2.twoValue).to.equal(42);
      });

      it('should be a no-op if the receiver is not connected', () => {
        expect(() => Signal.disconnectReceiver({})).to.not.throw(Error);
      });
    });

    describe('.disconnectAll()', () => {
      it('should clear all connections for an object', () => {
        let counter = 0;
        let onCount = () => {
          counter++;
        };
        let ext1 = new ExtendedObject();
        let ext2 = new ExtendedObject();
        ext1.one.connect(ext1.onNotify, ext1);
        ext1.one.connect(ext2.onNotify, ext2);
        ext1.one.connect(onCount);
        ext2.one.connect(ext1.onNotify, ext1);
        ext2.one.connect(ext2.onNotify, ext2);
        ext2.one.connect(onCount);
        Signal.disconnectAll(ext1);
        ext1.one.emit(undefined);
        ext2.one.emit(undefined);
        expect(ext1.notifyCount).to.equal(0);
        expect(ext2.notifyCount).to.equal(1);
        expect(counter).to.equal(1);
      });
    });

    describe('.clearData()', () => {
      it('should clear all signal data associated with an object', () => {
        let counter = 0;
        let onCount = () => {
          counter++;
        };
        let ext1 = new ExtendedObject();
        let ext2 = new ExtendedObject();
        ext1.one.connect(ext1.onNotify, ext1);
        ext1.one.connect(ext2.onNotify, ext2);
        ext1.one.connect(onCount);
        ext2.one.connect(ext1.onNotify, ext1);
        ext2.one.connect(ext2.onNotify, ext2);
        ext2.one.connect(onCount);
        Signal.clearData(ext1);
        ext1.one.emit(undefined);
        ext2.one.emit(undefined);
        expect(ext1.notifyCount).to.equal(0);
        expect(ext2.notifyCount).to.equal(1);
        expect(counter).to.equal(1);
      });
    });

    describe('.getExceptionHandler()', () => {
      it('should default to an exception handler', () => {
        expect(Signal.getExceptionHandler()).to.be.a('function');
      });
    });

    describe('.setExceptionHandler()', () => {
      afterEach(() => {
        Signal.setExceptionHandler(console.error);
      });

      it('should set the exception handler', () => {
        let handler = (err: Error) => {
          console.error(err);
        };
        Signal.setExceptionHandler(handler);
        expect(Signal.getExceptionHandler()).to.equal(handler);
      });

      it('should return the old exception handler', () => {
        let handler = (err: Error) => {
          console.error(err);
        };
        let old1 = Signal.setExceptionHandler(handler);
        let old2 = Signal.setExceptionHandler(old1);
        expect(old1).to.equal(console.error);
        expect(old2).to.equal(handler);
      });

      it('should invoke the exception handler on a slot exception', () => {
        let called = false;
        let obj = new TestObject();
        let handler = new TestHandler();
        obj.one.connect(handler.onThrow, handler);
        Signal.setExceptionHandler(() => {
          called = true;
        });
        expect(called).to.equal(false);
        obj.one.emit(undefined);
        expect(called).to.equal(true);
      });
    });
  });

  describe('Stream', () => {
    describe('#[Symbol.asyncIterator]()', () => {
      it('should yield emissions and respect blocking', async () => {
        const stream = new Stream<unknown, string>({});
        const input = 'async';
        const expected = 'aINTERRUPTEDsync';
        const wait = Promise.resolve();
        let emitted = '';
        let once = true;
        stream.connect(() => {
          if (once) {
            once = false;
            stream.emit('I');
            stream.emit('N');
            stream.emit('T');
            stream.emit('E');
            stream.emit('R');
            stream.emit('R');
            stream.emit('U');
            stream.emit('P');
            stream.emit('T');
            stream.emit('E');
            stream.emit('D');
          }
        });
        wait.then(() => stream.block(() => stream.emit('BLOCKED EMISSION 1')));
        input.split('').forEach(x => wait.then(() => stream.emit(x)));
        wait.then(() => stream.block(() => stream.emit('BLOCKED EMISSION 2')));
        wait.then(() => stream.stop());
        for await (const letter of stream) {
          emitted = emitted.concat(letter);
        }
        expect(emitted).to.equal(expected);
      });

      it('should return an async iterator', async () => {
        const stream = new Stream<unknown, string>({});
        const input = 'iterator';
        const expected = 'iAHEMterator';
        const wait = Promise.resolve();
        let emitted = '';
        let once = true;
        stream.connect(() => {
          if (once) {
            once = false;
            stream.emit('A');
            stream.emit('H');
            stream.emit('E');
            stream.emit('M');
          }
        });
        wait.then(() => stream.block(() => stream.emit('BLOCKED EMISSION 1')));
        input.split('').forEach(x => wait.then(() => stream.emit(x)));
        wait.then(() => stream.block(() => stream.emit('BLOCKED EMISSION 2')));
        wait.then(() => stream.stop());

        const it = stream[Symbol.asyncIterator]();
        let emission: IteratorResult<string, any>;
        while (!(emission = await it.next()).done) {
          emitted = emitted.concat(emission.value);
        }

        expect(emitted).to.equal(expected);
      });
    });

    describe('#stop()', () => {
      it('should stop emissions in the async interable', async () => {
        const stream = new Stream<unknown, string>({});
        const one = 'alpha';
        const two = 'beta';
        const three = 'delta';
        const expected = 'aINTERRUPTEDlphadelta';
        const wait = Promise.resolve();
        let emitted = '';
        let once = true;

        stream.connect(() => {
          if (once) {
            once = false;
            stream.emit('I');
            stream.emit('N');
            stream.emit('T');
            stream.emit('E');
            stream.emit('R');
            stream.emit('R');
            stream.emit('U');
            stream.emit('P');
            stream.emit('T');
            stream.emit('E');
            stream.emit('D');
          }
        });

        one.split('').forEach(x => wait.then(() => stream.emit(x)));
        wait.then(() => stream.stop());

        // These should not be collected because the iterator has stopped.
        two.split('').forEach(x => wait.then(() => stream.emit(x)));
        wait.then(() => stream.stop());

        for await (const letter of stream) {
          emitted = emitted.concat(letter);
        }

        // These should be collected because there is a new iterator.
        three.split('').forEach(x => wait.then(() => stream.emit(x)));
        wait.then(() => stream.stop());

        for await (const letter of stream) {
          emitted = emitted.concat(letter);
        }

        expect(emitted).to.equal(expected);
      });

      it('should resolve to `done` in an async iterator', async () => {
        const stream = new Stream<unknown, string>({});
        const input = 'stopiterator';
        const expected = 'sAHEMtopiterator';
        const wait = Promise.resolve();
        let emitted = '';
        let once = true;
        stream.connect(() => {
          if (once) {
            once = false;
            stream.emit('A');
            stream.emit('H');
            stream.emit('E');
            stream.emit('M');
          }
        });
        input.split('').forEach(x => wait.then(() => stream.emit(x)));
        wait.then(() => stream.stop());

        const it = stream[Symbol.asyncIterator]();
        let emission: IteratorResult<string, any>;
        while (!(emission = await it.next()).done) {
          emitted = emitted.concat(emission.value);
        }

        expect(emitted).to.equal(expected);
      });
    });
  });
});
