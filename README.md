# TSgl
A Typescript WebGL based Rendering Engine

## Introduction

Welcome to TSgl. This is a hobby project of mine, wanting to have a rendering engine completely platform indipendent

Functionality right now is pretty scarce, but new stuff is on the way.

## Features

Available:

* [x] Basic Scene-Hierarchy functionality
* [x] Automatic resource handling
* [x] Proprietary JSON-based model format
* [x] Complete Phong-capable material system
* [x] Rudimentary phong shader with single, directional light support

Planned:

* [ ] Normal mapping (infrastructure ready, only shader code missing)
* [ ] Multi-light and point light phong shader
* [ ] 2D Physics engine
* [ ] Runtime instancing of gameobjects
* [ ] Runtime Engine extensibility

## Notes

Uses a repackaged version of [TSM](https://github.com/matthiasferch/TSM) by [@matthiasferch](https://github.com/matthiasferch)

Uses (by default) the AMD module system and packages a copy of [RequireJS](http://requirejs.org/)
