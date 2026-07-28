# Small DI
![NPM Version](https://img.shields.io/npm/v/small-di)

Lightweight, zero dependencies, type-safe, type hints, without decorators and `reflect-metadata`.

## Installation

Install with npm:
```shell
npm i small-di
```

## Usage

Provide some deps to container. You must specify how your deps should be created and injected:
```ts
const di = createContainer<{ // provide some types
    api: IApi,
    userService: IUserService,
}>({
    api: {
        factory(): IApi {
            return new Api();
        },
        mode: 'singleton', // if not specified, container's mode is used ("default"). See below for more info.
    },
    userService: {
        factory(deps): IUserService {
            return new UserService(deps.api);
        },
    },
})
```
Get what you need:
```ts
const api = di.resolve('api');
api.fetchData();

const userService = di.resolve('userService');
userService.getUser();
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
### `createContainer(options?, spec)`
Creates new container.

Optional `options` argument can be passed:
- `options.mode?` - `default` or `singleton`. Container selected mode. Can be used to reduce boilerplate.

`spec` provides information, how deps should be handled:
- `spec.factory(deps)` - creation method for dependency
- `spec.mode?` - `default` or `singleton`. Overrides container's selected mode. If `default` will be created every time when requested. If `singleton` - will be created only once, and then reused.

Requested means using `.resolve` or by getter `deps.depName` in `factory` (handled with `Proxy`).

### `container.resolve(name)`
Resolves dependency by its name.

## License
[MIT](LICENSE)