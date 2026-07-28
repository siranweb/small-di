const DEFAULT_OPTIONS: Required<Options> = Object.freeze({
  mode: 'default',
});

export function createContainer<DepsList extends Record<string, any>>(spec: DepsSpec<DepsList>): Container<DepsList>;
export function createContainer<DepsList extends Record<string, any>>(options: Options, spec: DepsSpec<DepsList>): Container<DepsList>;
export function createContainer<DepsList extends Record<string, any>>(
  optionsOrSpec: Options | DepsSpec<DepsList>,
  spec?: DepsSpec<DepsList>,
): Container<DepsList> {
  const singletons: Partial<DepsList> = {};
  const resolving = new Set<keyof DepsList>();
  const options = { ...DEFAULT_OPTIONS, ...(spec ? optionsOrSpec : {})} as Required<Options>;
  const passedSpec = spec ?? optionsOrSpec as DepsSpec<DepsList>;

  const deps = new Proxy({} as DepsList, {
      get(_target, p: keyof DepsList & string): any {
          return resolve(p);
      }
  });

  const resolve = <Name extends keyof DepsList>(name: Name & string): DepsList[Name] => {
      if (resolving.has(name)) {
          const cyclePath = Array.from(resolving).concat(name).join(' -> ');
          throw new Error(`Circular dependency detected: ${cyclePath}`);
      }

      if (!passedSpec[name]) {
          throw new Error(`Dependency "${name}" not found`);
      }

      try {
          resolving.add(name);
          const mode = passedSpec[name].mode ?? options.mode;
          if (mode === 'singleton') {
              if (!singletons[name]) {
                  singletons[name] = passedSpec[name].factory(deps);
              }
              return singletons[name]!;
          }
          return passedSpec[name].factory(deps);
      } finally {
          resolving.delete(name);
      }
  }

  return {
      resolve,
  };
}

type Options = {
    /** Mode for dependencies. If not provided, `default` is used. */
    mode?: Mode;
}

type Mode = 'default' | 'singleton';

type DepsSpec<DepsList extends Record<string, any>> = {
    [K in keyof DepsList]: {
        factory: (deps: DepsList) => DepsList[K];
        mode?: Mode;
    };
};

type Container<DepsList extends Record<string, any>> = {
    resolve: <Name extends keyof DepsList>(name: Name & string) => DepsList[Name];
}