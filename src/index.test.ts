import { createContainer } from '.';

describe('small-di', () => {
  it('should resolve basic dependency', () => {
    const container = createContainer<{
      dep1: { method: (msg: string) => void };
    }>({
      dep1: {
        factory: () => ({
          method() {},
        }),
      },
    });

    const dep1 = container.resolve('dep1');
    expect(typeof dep1.method).toBe('function');
  });

  it('should support singleton mode', () => {
    let createCount = 0;

    const container = createContainer<{
      dep1: { id: number };
    }>({
      dep1: {
        mode: 'singleton',
        factory: () => {
          createCount++;
          return { id: createCount };
        },
      },
    });

    const first = container.resolve('dep1');
    const second = container.resolve('dep1');

    expect(first.id).toBe(1);
    expect(second.id).toBe(1);
    expect(createCount).toBe(1);
  });

  it('should support default mode', () => {
    let createCount = 0;

    const container = createContainer<{
      dep1: { id: number };
    }>({
      dep1: {
        mode: 'default',
        factory: () => {
          createCount++;
          return { id: createCount };
        },
      },
    });

    const first = container.resolve('dep1');
    const second = container.resolve('dep1');

    expect(first.id).toBe(1);
    expect(second.id).toBe(2);
    expect(createCount).toBe(2);
  });

  it('should resolve nested dependencies', () => {
    const calls: string[] = [];

    const container = createContainer<{
      dep1: { method1: () => void };
      dep2: { method2: () => void };
      dep3: { method3: () => void };
    }>({
      dep1: {
        mode: 'singleton',
        factory: () => {
          calls.push('dep1');
          return {
            method1() {},
          };
        },
      },
      dep2: {
        mode: 'singleton',
        factory: (deps) => {
          calls.push('dep2');
          deps.dep1
          return {
            method2() {},
          };
        },
      },
      dep3: {
        mode: 'singleton',
        factory: (deps) => {
          calls.push('dep3');
          deps.dep2
          deps.dep1
          return {
            method3() {},
          };
        },
      },
    });

    container.resolve('dep3');

    expect(calls).toEqual([
      'dep3',
      'dep2',
      'dep1',
    ]);
  });

  it('should share singleton instances', () => {
    let dep1Created = 0;

    const container = createContainer<{
      dep1: { id: number };
      dep2: { getDep1Id: () => number };
      dep3: { getDep1Id: () => number };
    }>({
      dep1: {
        mode: 'singleton',
        factory: () => {
          dep1Created++;
          return { id: dep1Created };
        },
      },
      dep2: {
        factory: (deps) => ({
          getDep1Id: () => deps.dep1.id,
        }),
      },
      dep3: {
        factory: (deps) => ({
          getDep1Id: () => deps.dep1.id,
        }),
      },
    });

    const dep2 = container.resolve('dep2');
    const dep3 = container.resolve('dep3');

    expect(dep2.getDep1Id()).toBe(1);
    expect(dep3.getDep1Id()).toBe(1);
    expect(dep1Created).toBe(1);
  });

  it('should throw error on self circular dependency', () => {
    const container = createContainer<{
      dep1: { method: () => void };
    }>({
      dep1: {
        factory: (deps) => {
          deps.dep1
          return {
            method() {}
          }
        },
      },
    });

    expect(() => container.resolve('dep1')).toThrow(
        'Circular dependency detected: dep1 -> dep1'
    );
  });

  it('should throw error on direct circular dependency', () => {
    const container = createContainer<{
      dep1: { method: () => void };
      dep2: { method: () => void };
    }>({
      dep1: {
        factory: (deps) => {
          deps.dep2
          return {
            method() {}
          }
        },
      },
      dep2: {
        factory: (deps) => {
          deps.dep1
          return {
            method() {}
          }
        },
      }
    });

    expect(() => container.resolve('dep1')).toThrow(
        'Circular dependency detected: dep1 -> dep2 -> dep1'
    );
  });

  it('should throw error on indirect circular dependency', () => {
    const container = createContainer<{
      dep1: { method: () => void };
      dep2: { method: () => void };
      dep3: { method: () => void };
    }>({
      dep1: {
        factory: (deps) => {
          deps.dep2
          return {
            method() {},
          }
        },
      },
      dep2: {
        factory: (deps) => {
          deps.dep3
          return {
            method() {},
          }
        },
      },
      dep3: {
        factory: (deps) =>  {
          deps.dep1
          return {
            method() {},
          }
        },
      },
    });

    expect(() => container.resolve('dep1')).toThrow(
        'Circular dependency detected: dep1 -> dep2 -> dep3 -> dep1'
    );
  });

  it('should throw error on resolving missing dependency', () => {
    const container = createContainer<{}>({});
    // @ts-expect-error test purposes
    expect(() => container.resolve('dep1')).toThrow(
        `Dependency "dep1" not found`
    );
  });

  it('should allow self-referencing after creation', () => {
    const container = createContainer<{
      dep1: { init: () => void; value: number };
      dep2: { init: () => void; value: number };
    }>({
      dep1: {
        mode: 'singleton',
        factory: (deps) => {
          let val = 0;
          return {
            init: () => {
              val = deps.dep2.value + 1;
            },
            get value() {
              return val;
            },
          };
        },
      },
      dep2: {
        mode: 'singleton',
        factory: (deps) => {
          let val = 0;
          return {
            init: () => {
              val = deps.dep1.value + 1;
            },
            get value() {
              return val;
            },
          };
        },
      },
    });

    const dep1 = container.resolve('dep1');
    const dep2 = container.resolve('dep2');

    dep1.init();
    dep2.init();

    expect(dep1.value).toBe(1);
    expect(dep2.value).toBe(2);
  });

  it('should maintain type safety', () => {
    interface IDep1 {
      fetchData(): Promise<any>;
    }
    interface IDep2 {
      getUser(id: number): Promise<any>;
    }

    const container = createContainer<{
      dep1: IDep1;
      dep2: IDep2;
    }>({
      dep1: {
        factory: () => ({
          fetchData: async () => ({}),
        }),
      },
      dep2: {
        factory: (deps) => {
          return {
            getUser: async (id) => {
              await deps.dep1.fetchData();
              return { id };
            },
          };
        },
      },
    });

    const dep1 = container.resolve('dep1');
    const dep2 = container.resolve('dep2');
    dep2.getUser(123);
  });

  describe('options', () => {
    it('should use default mode when options are omitted', () => {
      let createCount = 0;

      const container = createContainer<{
        dep1: { id: number };
      }>({
        dep1: {
          factory: () => {
            createCount++;
            return { id: createCount };
          },
        },
      });

      const first = container.resolve('dep1');
      const second = container.resolve('dep1');

      expect(first.id).toBe(1);
      expect(second.id).toBe(2);
      expect(createCount).toBe(2);
    });

    it('should use default mode when options.mode is omitted', () => {
      let createCount = 0;

      const container = createContainer<{
        dep1: { id: number };
      }>({}, {
        dep1: {
          factory: () => {
            createCount++;
            return { id: createCount };
          },
        },
      });

      const first = container.resolve('dep1');
      const second = container.resolve('dep1');

      expect(first.id).toBe(1);
      expect(second.id).toBe(2);
      expect(createCount).toBe(2);
    });

    it('should apply options.mode=default to all dependencies', () => {
      let createCount = 0;

      const container = createContainer<{
        dep1: { id: number };
      }>({ mode: 'default' }, {
        dep1: {
          factory: () => {
            createCount++;
            return { id: createCount };
          },
        },
      });

      const first = container.resolve('dep1');
      const second = container.resolve('dep1');

      expect(first.id).toBe(1);
      expect(second.id).toBe(2);
      expect(createCount).toBe(2);
    });

    it('should apply options.mode=singleton to all dependencies', () => {
      let createCount = 0;

      const container = createContainer<{
        dep1: { id: number };
      }>({ mode: 'singleton' }, {
        dep1: {
          factory: () => {
            createCount++;
            return { id: createCount };
          },
        },
      });

      const first = container.resolve('dep1');
      const second = container.resolve('dep1');

      expect(first).toBe(second);
      expect(first.id).toBe(1);
      expect(createCount).toBe(1);
    });

    it('should let dependency mode override options.mode=singleton', () => {
      let singletonCount = 0;
      let defaultCount = 0;

      const container = createContainer<{
        singletonDep: { id: number };
        defaultDep: { id: number };
      }>({ mode: 'singleton' }, {
        singletonDep: {
          factory: () => {
            singletonCount++;
            return { id: singletonCount };
          },
        },
        defaultDep: {
          mode: 'default',
          factory: () => {
            defaultCount++;
            return { id: defaultCount };
          },
        },
      });

      const singletonFirst = container.resolve('singletonDep');
      const singletonSecond = container.resolve('singletonDep');
      const defaultFirst = container.resolve('defaultDep');
      const defaultSecond = container.resolve('defaultDep');

      expect(singletonFirst).toBe(singletonSecond);
      expect(singletonCount).toBe(1);

      expect(defaultFirst).not.toBe(defaultSecond);
      expect(defaultFirst.id).toBe(1);
      expect(defaultSecond.id).toBe(2);
      expect(defaultCount).toBe(2);
    });

    it('should let dependency mode override options.mode=default', () => {
      let singletonCount = 0;
      let defaultCount = 0;

      const container = createContainer<{
        singletonDep: { id: number };
        defaultDep: { id: number };
      }>({ mode: 'default' }, {
        singletonDep: {
          mode: 'singleton',
          factory: () => {
            singletonCount++;
            return { id: singletonCount };
          },
        },
        defaultDep: {
          factory: () => {
            defaultCount++;
            return { id: defaultCount };
          },
        },
      });

      const singletonFirst = container.resolve('singletonDep');
      const singletonSecond = container.resolve('singletonDep');
      const defaultFirst = container.resolve('defaultDep');
      const defaultSecond = container.resolve('defaultDep');

      expect(singletonFirst).toBe(singletonSecond);
      expect(singletonCount).toBe(1);

      expect(defaultFirst).not.toBe(defaultSecond);
      expect(defaultFirst.id).toBe(1);
      expect(defaultSecond.id).toBe(2);
      expect(defaultCount).toBe(2);
    });

    it('should share nested dependencies when options.mode=singleton', () => {
      let dep1Created = 0;

      const container = createContainer<{
        dep1: { id: number };
        dep2: { getDep1Id: () => number };
        dep3: { getDep1Id: () => number };
      }>({ mode: 'singleton' }, {
        dep1: {
          factory: () => {
            dep1Created++;
            return { id: dep1Created };
          },
        },
        dep2: {
          factory: (deps) => ({
            getDep1Id: () => deps.dep1.id,
          }),
        },
        dep3: {
          factory: (deps) => ({
            getDep1Id: () => deps.dep1.id,
          }),
        },
      });

      const dep2 = container.resolve('dep2');
      const dep3 = container.resolve('dep3');

      expect(dep2.getDep1Id()).toBe(1);
      expect(dep3.getDep1Id()).toBe(1);
      expect(dep1Created).toBe(1);
    });

    it('should create nested dependencies on every access when options.mode=default', () => {
      let dep1Created = 0;

      const container = createContainer<{
        dep1: { id: number };
        dep2: { getDep1Id: () => number };
      }>({ mode: 'default' }, {
        dep1: {
          factory: () => {
            dep1Created++;
            return { id: dep1Created };
          },
        },
        dep2: {
          factory: (deps) => ({
            getDep1Id: () => deps.dep1.id,
          }),
        },
      });

      const dep2 = container.resolve('dep2');

      expect(dep2.getDep1Id()).toBe(1);
      expect(dep2.getDep1Id()).toBe(2);
      expect(dep1Created).toBe(2);
    });

    it('should still detect circular dependencies with options', () => {
      const container = createContainer<{
        dep1: { method: () => void };
        dep2: { method: () => void };
      }>({ mode: 'singleton' }, {
        dep1: {
          factory: (deps) => {
            deps.dep2;
            return {
              method() {},
            };
          },
        },
        dep2: {
          factory: (deps) => {
            deps.dep1;
            return {
              method() {},
            };
          },
        },
      });

      expect(() => container.resolve('dep1')).toThrow(
        'Circular dependency detected: dep1 -> dep2 -> dep1'
      );
    });

    it('should throw on missing dependency with options', () => {
      const container = createContainer<{}>({}, {});
      // @ts-expect-error test purposes
      expect(() => container.resolve('dep1')).toThrow(
        `Dependency "dep1" not found`
      );
    });
  });
});
