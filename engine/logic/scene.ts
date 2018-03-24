import { Transform } from "../wrappers/world"
import { Mesh, MeshInstance } from "../wrappers/mesh"
import { Material } from "../wrappers/material"
import { TSM } from "../tsm"
import { IResourceUser, IResource, ResourceType, IAsyncLoadedObject, MeshProtocol, ReferenceHolder, ResourceManager } from "../resourceManager";
import { TSglContext, GLStatus } from "../wrappers/gl";
import { Engine } from "../engine";
import { Map } from "../map"

export interface ILogicObject{
	readonly loaded: boolean
	readonly id: string
}

export class Scene{
	protected context: TSglContext
	protected root: Hierarchy 
	protected lights: TSM.vec4[] = new Array<TSM.vec4>(new TSM.vec4([0, 0, -.5, 1]))
	protected status: GLStatus = new GLStatus()
	protected cameraTransform: Transform = Transform.identityTransform
	protected parent: Engine;

	constructor(parent: Engine, context: TSglContext){
		this.parent = parent
		this.context = context
		this.root = new Hierarchy("root", this, this.context, Transform.identityTransform)
		this.status.projectionMatrix = TSM.mat4.perspective(90.0, 16 / 9, 0.01, 100)
		this.status.viewMatrix = TSM.mat4.lookAt(new TSM.vec3([0, 0, 1]), new TSM.vec3([0, 0, 0]), new TSM.vec3([0, 1, 0]))
	}

	moveCamera(dir: TSM.vec3){
		this.cameraTransform.position.add(dir)
	}

	draw(){
		this.status.viewMatrix.translate(this.cameraTransform.position.negate(new TSM.vec3()))
		this.root.draw(this.status, this.lights)
		this.status.viewMatrix.translate(this.cameraTransform.position)
		
	}

	loadAsync(){
		this.root.loadAsync()
	}

	get rootHierarchy() : Hierarchy{
		return this.root
	}

	unload(){
		this.root.unload()
	}

	onRootHierarchyLoaded(){
		this.parent.onSceneLoaded(this)
	}
}


export class Hierarchy implements ILogicObject{
	
	readonly id: string
	owner: Hierarchy | Scene
	transform: Transform = new Transform(new TSM.vec3([0, 0, 0]), new TSM.vec3([0, 0, 0]), new TSM.vec3([1, 1, 1]))
	protected gameObjects: GameObject[] = new Array<GameObject>()
	protected hierarchies: Hierarchy[] = new Array<Hierarchy>()
	protected context: TSglContext
	protected _loaded: boolean = false

	getSubObject(id: string): Hierarchy | GameObject | null{
		for(var i = 0; i < this.gameObjects.length; i++){
			if(this.gameObjects[i].id == id)
				return this.gameObjects[i]
		}

		for(var i = 0; i < this.hierarchies.length; i++){
			if(this.hierarchies[i].id == id)
				return this.hierarchies[i]
			else{
				let l = this.hierarchies[i].getSubObject(id)
				if(l != null)
					return l
			}
		}
		
		return null
	}

	constructor(id: string, parent: Hierarchy | Scene, context: TSglContext, transform?: Transform){
		this.owner = parent
		this.id = id
		this.context = context
		if(transform != null && transform != undefined)
			this.transform = transform
	}

	makeGameObject(meshName: string, meshProtocol: MeshProtocol, materialNames: string[], transform?: Transform): string{
		let obj = new GameObject(this, meshName, meshProtocol, materialNames, this.id + "_" + this.gameObjects.length, this.context)
		if(transform != null)
			obj.transform = transform
		this.gameObjects.push(obj)
		return obj.id
	}

	makeHierarchy(transform: Transform): string{
		let hrc = new Hierarchy(this.id + "_" + this.hierarchies.length, this, this.context, transform)
		this.hierarchies.push(hrc)
		return hrc.id
	}

	get loaded(): boolean{
		return this._loaded;
	}

	private recursiveLoaded(): boolean{
		for(var i = 0; i < this.gameObjects.length; i++){
			if(!this.gameObjects[i].loaded)
				return false
		}
		for(var i = 0; i < this.hierarchies.length; i++){
			if(!this.hierarchies[i].loaded)
				return false
		}
		return true
	}

	onObjectLoaded(object: GameObject | Hierarchy){
		if(this.recursiveLoaded()){
			this._loaded = true
			if(this.owner instanceof Hierarchy)
				this.owner.onObjectLoaded(this)
			else{
				this.owner.onRootHierarchyLoaded()
			}
		}	
	}

	loadAsync(){
		this.gameObjects.forEach((obj) => {
			obj.loadAsync()
		})

		this.hierarchies.forEach((hi) => {
			hi.loadAsync()
		})
	}

	unload(){
		this.gameObjects.forEach((obj) => {
			obj.unload()
		})

		this.hierarchies.forEach((hi) => {
			hi.unload()
		})

		this._loaded = false
	}

	draw(status: GLStatus, lights: TSM.vec4[]){
		if(!this.loaded)
			return
		status.applyTransformToModel(this.transform)
		this.gameObjects.forEach((obj) => {
			obj.draw(status, lights)
		})

		this.hierarchies.forEach((hi) => {
			hi.draw(status, lights)
		})
		status.revertLastModelTransform()
	}
}

export class GameObject implements ILogicObject{
	protected _loaded: boolean = false
	transform: Transform
	meshInstance: MeshInstance
	owner: Hierarchy
	id: string
	context: TSglContext

	constructor(owner: Hierarchy, meshName: string, meshProtocol: MeshProtocol, materilaNames: string[], id: string, context: TSglContext){
		this.owner = owner
		this.id = id
		this.context = context
		this.meshInstance = new MeshInstance(this.context, meshName, meshProtocol, materilaNames)
		this.transform = Transform.identityTransform
	}

	get loaded(): boolean{
		return this._loaded
	}

	draw(status: GLStatus, lights: TSM.vec4[]){
		status.applyTransformToModel(this.transform)
		this.meshInstance.draw(status, lights)
		status.revertLastModelTransform()
	}

	loadAsync(){
		this.meshInstance.loadAsync((obj) => {
			this._loaded = true
			this.owner.onObjectLoaded(this)
		})
	}

	unload(){
		this.meshInstance.unload()
		this._loaded = false
	}
}