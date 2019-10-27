# N&M's - Node and Micro services

N&M's is a NodeJS framework working with Typescript.
It provides a flexible architecture to coordinate the different modules of an application solution.


N&M's allows developers to quickly start a new micro-services project and focus on features because of the built-ins to process common tasks.

## Installation

N&M's delivers a core package, `nnms`, which holds all the core functionalities of the framework. In most of the cases, it will be needed to install specific packages to extend the possibilities of the framework, for example to bind a HTTP server on a module, the installation of the `nnms-http` will be necessary.

```bash
npm install --save nnms
[npm install --save nnms-http]
```

## Core concept

The architecture of a N&M's application uses three main objects: provider, module and plugin.

### Provider

A Provider represents a global service that can be injected into a module, plugin or other provider. A singleton is created during the application bootstrap then shared between all the objects in the application.

### Module

A Module represents a entry point into a isolated scope of services. It is possible to inject a provider into module but it is not possible to inject other module. In many cases, modules are bounded to one or more servers to communicate internally and externally.

### Plugin

A Plugin represents a extension of a module. By declaring a plugin on a module, a lot of common functionalities will become available using decorators on methods or parameter of the module class. For example, a plugin can bind a method to a http route or a broker subject.

## Getting started

To start a N&M's project, you need to declare at least one module, then bootstrap it.

```typescript
  // index.ts
  import { Module } from 'nnms'
  import { HttpPlugin } from 'nnms-http'

  const WEB_VARS = {LOCALE: '', HTTP_PORT: '8080'}

  @Module('web', WEB_VARS, HttpPlugin)
  class WebModule {
    constructor(
      private readonly _ctx: ModuleContext
    ) { }

    @HttpRoute({resType: 'string'})
    hello() {
        return this._ctx.vars.LOCALE === 'fr' ? 'Bonjour' : 'Hello'
    }
  }

  bootstrap({name: 'getting-started'}, WebModule)

```

The first step is to declare a class decorated with `Module`.


It is required to set a unique name (`'web'`) for the module as the first argument.


The second argument describes the variables used by the module.


The following arguments represents the plugins (`HttpPlugin`) bounded to the module.


Declaring the plugin, allows to use its decorator (`HttpRoute`) to provide some functionalities
for the module.


Here, `HttpRoute` registers the route on `HttpPlugin`, and then `HttpPlugin` tells `HttpProvider`
to start a server.

To run the module, execute the following commands:

```bash
  tsc -p tsconfig.json
  WEB_LOCALE=fr node ./index.js
```

Then access to the http route:

```bash
  curl localhost:8080
  # Bonjour
```
