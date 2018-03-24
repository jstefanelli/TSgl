import { Buffer, IDrawable, TSglContext, GLStatus } from "./gl"
import { Material } from "./material"
import { IResource, IResourceUser, ISyncLoadedObject, ResourceType, ResourceManager, IAsyncLoadedObject, MeshProtocol } from "../resourceManager";
import { TSM } from "../tsm"
import { Scene, Hierarchy } from "../logic/scene";
import { Pair } from "../pair";

export class MeshPart{
	count: number
	offset: number

	constructor(count: number, offset: number){
		this.count = count
		this.offset = offset
	}
}

export class Mesh implements IResource, ISyncLoadedObject{
	protected _vertices: Buffer
	protected _normals: Buffer
	protected _texCoords: Buffer
	protected _parts: Array<MeshPart>
	protected _loaded: boolean
	protected ctx: TSglContext

	get vertices(): Buffer{
		return this._vertices
	}

	get normals(): Buffer{
		return this._normals
	}

	get tex(): Buffer{
		return this._texCoords
	}

	get type(): ResourceType{
		return ResourceType.MESH
	}

	constructor(vertices: Buffer, normals: Buffer, tex: Buffer, parts: Array<MeshPart>, context: TSglContext){
		this._vertices = vertices
		this._normals = normals
		this._texCoords = tex
		this._parts = parts
		this.ctx = context
	}

	load(){
		this._vertices.load()
		this._normals.load()
		this._texCoords.load()

		this._loaded = true
	}

	unload(){
		this._vertices.unload()
		this._normals.unload()
		this._texCoords.unload()

		this._loaded = false
	}

	get parts(): Array<MeshPart>{
		return this._parts
	}

	get loaded(): boolean{
		return this._loaded
	}
}

export class MeshPartInstance implements IDrawable {
	protected _material: Material
	protected _offset: number
	protected _count: number
	protected _matName: string
	protected e: TSglContext

	protected _baseMesh: Mesh

	constructor(matName: string, baseMesh: Mesh, count: number, offset: number, context: TSglContext){
		this._matName = matName
		this._baseMesh = baseMesh
		this._count = count
		this._offset = offset
		this.e = context
	}

	get materialName(): string{
		return this._matName
	}

	get material(): Material{
		return this._material
	}

	set material(mat: Material){
		this._material = mat
	}

	get offset(): number{
		return this._offset
	}

	get count(): number{
		return this._count
	}
	
	get vertices(): Buffer{
		return this._baseMesh.vertices
	}
	
	get normals(): Buffer{
		return this._baseMesh.normals
	}

	get texCoords(): Buffer{
		return this._baseMesh.tex
	}

	loaded: boolean = false
}

export class MeshInstance implements IAsyncLoadedObject, IResourceUser {
	
	protected _loaded: boolean = false
	protected context: TSglContext
	protected sections: Pair<boolean, MeshPartInstance>[]
	protected material_names: string[]
	protected meshName: string
	protected meshProtocol: MeshProtocol
	protected mesh: Mesh
	protected materials: Material[] = new Array<Material>()
	protected cb: (object: IAsyncLoadedObject) => void

	constructor(context: TSglContext, meshName: string, meshProtocol: MeshProtocol, material_names: Array<string>){
		this.context = context
		this.meshName = meshName
		this.material_names = material_names
		this.meshProtocol = meshProtocol
		this.sections = new Array<Pair<boolean, MeshPartInstance>>()
		
	}

	get loaded(): boolean{
		return this._loaded
	}

	draw(status: GLStatus, lights: TSM.vec4[]){
		if(!this._loaded)
			return
		this.sections.forEach((section: Pair<boolean, MeshPartInstance>) => {
			if(section.key)
				section.value.material.shader.value.draw(status, section.value, lights)
		})
	}

	loadAsync(cb: (object: IAsyncLoadedObject) => void){
		this.cb = cb

		this.context.manager.getMesh(this.meshName, this.meshProtocol, this)
	}

	unload() {
		this.sections.forEach((section: Pair<boolean, MeshPartInstance>) => {
			this.context.manager.unreferenceMaterial(section.value.materialName, this)
			section.key = false
		})

		this.context.manager.unreferenceMesh(this.meshName, this)
	}

	private checkResources(){
		for(var i = 0; i < this.sections.length; i++){
			if(!this.sections[i].key)
				return
		}
		this._loaded = true
		this.cb(this)
	}

	private genSections(){
		if(this.mesh.parts.length > this.material_names.length){
			throw new Error("Invalid amount of materials passed to meshInstance")
		}
		
		for(var i = 0; i < this.mesh.parts.length; i++){
			let part = new MeshPartInstance(this.material_names[i], this.mesh, this.mesh.parts[i].count, this.mesh.parts[i].offset, this.context)
			this.sections.push(new Pair<boolean, MeshPartInstance>(false, part))
		}


		this.sections.forEach((sec: Pair<boolean, MeshPartInstance>) => {
			this.context.manager.getMaterial(sec.value.materialName, this)
		})
	}

	resourceReady(resource: IResource, resourceName: string, resourceType: ResourceType) {
		if(resourceType == ResourceType.MESH){
			this.mesh = resource as Mesh
			this.genSections()
			return
		}

		if(resourceType == ResourceType.MATERIAL){
			for(var i = 0; i < this.sections.length; i++){
				let pair = this.sections[i]
				if(pair.key)
					continue
				let sec = pair.value
				if(sec.materialName == resourceName){
					sec.material = resource as Material
					pair.key = true
				}
			}
		}
		this.checkResources()
	}
}