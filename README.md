# Small DI
Lightweight, zero dependencies, type-safe, without decorators and `reflect-metadata`.

## Installation

Install with npm:
```shell
npm i small-di
```

## Usage
First, specify your classes, variables, etc.:
```ts
interface IApi {
    fetchData(): void;
}
interface IUserService {
    getUser(): void;
}

class Api implements IApi {
    public fetchData() {
        console.log('fetchData')
    }
}

class UserService implements IUserService {
    constructor(private readonly api: IApi) {}

    public getUser() {
        console.log('getUser')
    }
}

const config = {
    SECRET: 'secret',
} as const
```

Now, provide them to container. You must specify how your deps should be created and injected:
```ts
const di = createContainer<{ // provide some types
    api: IApi,
    userService: IUserService,
    config: typeof config, // manually created types are optional, but recommended
}>({
    api: {
        factory(): IApi {
            return new Api();
        },
        mode: 'singleton', // if not specified, "default" is used
    },
    userService: {
        factory({ api }): IUserService { // factory gets "deps" object
            return new UserService(api);
        },
    },
    config: {
        factory() {
            return config;
        }
    }
})
```
Get what you need:
```ts
const api = di.resolve('api');
api.fetchData();

const userService = di.resolve('userService');
userService.getUser();

const config = di.resolve('config');
console.log(config.SECRET);
```

...and that's all.

Also, you'll get error if try to resolve missing dependency or face circular dependency:
```ts
const di = createContainer<{
    dep1: any,
    dep2: any,
    dep3: any,
}>({
    dep1: { factory({ dep2 }) {} },
    dep2: { factory({ dep3 }) {} },
    dep3: { factory({ dep2 }) {} },
})

di.resolve('dep4') // Error: Dependency "dep4" not found
di.resolve('dep1') // Error: Circular dependency detected: dep1 -> dep2 -> dep3 -> dep2
```

## API
### `createContainer(spec)`
Creates new container. `spec` provides information, how deps should be handled:
- `spec.factory(deps)` - creation method for dependency
- `spec.mode?` - `default` or `singleton`. If `default` will be created every time when requested. If `singleton` - will be created only once, and then reused.

Requested means using `.resolve` or by getter `deps.depName` in `factory` (handled with `Proxy`).

### `container.resolve(name)`
Resolves dependency by its name.

## License
[MIT](LICENSE)