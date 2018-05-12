import { Transform } from "../wrappers/world"
import { Mesh, MeshInstance } from "../wrappers/mesh"
import { Material } from "../wrappers/material"
import { TSM } from "../tsm"
import { IResourceUser, IResource, ResourceType, IAsyncLoadedObject, MeshProtocol, ReferenceHolder, ResourceManager } from "../resourceManager";
import { TSglContext, GLStatus, PhongShader } from "../wrappers/gl";
import { Engine } from "../engine";
import { Map } from "../map"
import { Light, DirectionalLight, PointLight, LightType } from "../wrappers/light"
import { Camera } from "./camera"

export interface ILogicObject{
	readonly loaded: boolean
	readonly id: string
}

export class Scene{
	protected context: TSglContext
	protected root: Hierarchy 
	protected lights: Light[] = new Array<Light>(new DirectionalLight())
	protected status: GLStatus = new GLStatus()
	protected parent: Engine
	protected _activeCamera: Camera

	constructor(parent: Engine, context: TSglContext){
		this.parent = parent
		this.context = context
		this.root = new Hierarchy("root", this, this.context, Transform.identityTransform)
		this._activeCamera = new Camera();
		(this.lights[0] as DirectionalLight).direction = new TSM.vec3([0, -0.5, 0.5]).normalize();
		(this.lights[0] as DirectionalLight).factors = new TSM.vec3([1, 1, 1])
		/*let l = new PointLight()
		l.position = new TSM.vec3([0.0, -0.15, 0])
		l.funcFactors = new TSM.vec3([1.0, 1.7, 2.2])
		let l2 = new PointLight()
		l2.position = new TSM.vec3([-1, -0.15, 0])
		l2.funcFactors = new TSM.vec3([1.0, 1.7, 2.2])
		let l3 = new PointLight()
		l3.position = new TSM.vec3([1, -0.15, 0])
		l3.funcFactors = new TSM.vec3([1.0, 1.7, 2.2])
		this.lights.push(l)
		this.lights.push(l2)
		this.lights.push(l3)*/
	}

	private static getDistance(p1: TSM.vec3, p2: TSM.vec3) : number{
		return p1.copy().subtract(p2).length()
	}


	draw(){
		var dirLight: Light = null;
		let pointLights = new Array<PointLight>()

		this.lights.forEach((light) => {
			if(light.type == LightType.DIR && dirLight == null){
				dirLight = light
				return
			}
			if(light.type == LightType.POINT){
				let pl: PointLight = light as PointLight
				pointLights.push(pl)
			}
		})

		pointLights.sort((a: PointLight, b: PointLight) : number => {
			return Scene.getDistance(a.position, this._activeCamera.position) - Scene.getDistance(b.position, this._activeCamera.position)
		})
		pointLights = pointLights.slice(0, PhongShader.pointLightNumber)

		let lts = new Array<Light>()
		lts.push(dirLight)
		pointLights.forEach((light) => {
			lts.push(light)
		})

		this.status.applyCamera(this._activeCamera)
		this.root.draw(this.status, lts)
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

	get glStatus(): GLStatus{
		return this.status
	}

	set activeCamera(c: Camera){
		this._activeCamera = c
	}

	get activeCamera(): Camera{
		return this._activeCamera
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
		let hrc = new Hierarchy(this.id + "/" + this.hierarchies.length, this, this.context, transform)
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

	draw(status: GLStatus, lights: Light[]){
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

	draw(status: GLStatus, lights: Light[]){
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