export function createContainer<DepsList extends Record<string, any>>(
  spec: DepsSpec<DepsList>
) {
  const singletons: Partial<DepsList> = {};
  const resolving = new Set<keyof DepsList>();

  const deps = new Proxy({} as DepsList, {
      get(_target, p: keyof DepsList & string): any {
          return resolve(p);
      }
  });

  const resolve = <Name extends keyof DepsList>(name: Name): DepsList[Name] => {
      if (resolving.has(name)) {
          const cyclePath = Array.from(resolving).concat(name).join(' -> ');
          throw new Error(`Circular dependency detected: ${cyclePath}`);
      }

      try {
          resolving.add(name);
          if (spec[name].mode === 'singleton') {
              if (!singletons[name]) {
                  singletons[name] = spec[name].factory(deps);
              }
              return singletons[name]!;
          }
          return spec[name].factory(deps);
      } finally {
          resolving.delete(name);
      }
  }

  return {
      resolve,
  };
}

type DepsSpec<DepsList extends Record<string, any>> = {
    [K in keyof DepsList]: {
        factory: (deps: DepsList) => DepsList[K];
        mode?: 'default' | 'singleton';
    };
};