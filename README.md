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
