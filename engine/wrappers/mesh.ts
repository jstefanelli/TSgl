import { Buffer, IDrawable, TSglContext, GLStatus, BufferLayout } from "./gl"
import { Material } from "./material"
import { IResource, IResourceUser, ISyncLoadedObject, ResourceType, ResourceManager, IAsyncLoadedObject, MeshProtocol } from "../resourceManager";
import { TSM } from "../tsm"
import { Scene, Hierarchy } from "../logic/scene";
import { Pair } from "../pair";
import { Light } from "./light";

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
	protected _tangents: Buffer
	protected _biTangents: Buffer
	protected _parts: Array<MeshPart>
	protected _loaded: boolean
	protected _drawMode: number
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

	get tangents(): Buffer{
		return this._tangents
	}

	get biTangents(): Buffer{
		return this._biTangents
	}

	get type(): ResourceType{
		return ResourceType.MESH
	}

	get drawMode(): number{
		return this._drawMode
	}

	constructor(vertices: Buffer, normals: Buffer, tex: Buffer, parts: Array<MeshPart>, context: TSglContext, drawMode: number | null = null){
		this._vertices = vertices
		this._normals = normals
		this._texCoords = tex
		this._parts = parts
		this.ctx = context
		if(drawMode == null)
			this._drawMode = this.ctx.gl.TRIANGLES
		else
			this._drawMode = drawMode
	}	

	load(){
		this._vertices.load()
		this._normals.load()
		this._texCoords.load()

		let aTangents = new Array<number>() 
		let aBiTangents = new Array<number>()

		if(this._drawMode == this.ctx.gl.TRIANGLES){
			for(var i = 0; i < this._vertices.content.length / 3; i+= 3){

				let vId = i * 3;
				let uvId = i * 2;

				let v0 = new TSM.vec3(this._vertices.content.slice(vId, vId+3))
				let v1 = new TSM.vec3(this._vertices.content.slice(vId+3, vId+6))
				let v2 = new TSM.vec3(this._vertices.content.slice(vId+6, vId+9))

				let uv0 = new TSM.vec2(this._texCoords.content.slice(uvId, uvId + 2))
				let uv1 = new TSM.vec2(this._texCoords.content.slice(uvId+2, uvId+4))
				let uv2 = new TSM.vec2(this._texCoords.content.slice(uvId+4, uvId+6))

				//DeltaPos1/2: Directions of the sides of the triangle (in modelSpace), not the position of the points (in modelSpace)
				let deltaPos1 = v1.subtract(v0)
				let deltaPos2 = v2.subtract(v0)

				//DeltaUV1/2: Direction of the UV "side" along the triangle sides. In Tangent space
				let deltaUV1 = uv1.subtract(uv0)
				let deltaUV2 = uv2.subtract(uv0)

				// Solving for: [
				// 	Tangent vector: T,
				// 	Bitangent vector: B
				// ]
				//
				// deltaPos1 = (deltaUV1.x * T) + (deltaUV1.y * B) => deltaPos1.x = (deltaUV1.x * T.x) + (deltaUV1.y * B.x) [same for y and z]
				// deltaPos2 = (deltaUV2.x * T) + (deltaUV2.y * B) => deltaPos2.x = (deltaUV2.x * T.x) + (deltaUV2.y * B.x) [same for y and z]
				//
				// This can be described as a matrix multiplication:  
				// 
				// [ deltaPos1.x, deltaPos1.y, deltaPos1.z ] = [ deltaUV1.x, deltaUV1.y ] [ T.x, T.y, T.z ]
				// [ deltaPos2.x, deltaPos2.y, deltaPos2.z ] = [ deltaUV2.x, deltaUV2.y ] [ B,x, B.y, B.z ]
				//
				// With inverted UV Matrix (2nd matrix) we isolate T and B on one side of equation and solve for them
				//
				// [ deltaUV1.x, deltaUV1.y ] ^ -1 [ deltaPos1.x, deltaPos1.y, deltaPos1.z ] = [ T.x, T.y, T.z ]
				// [ deltaUV2.x, deltaUV2.y ]      [ deltaPos2.x, deltaPos2.y, deltaPos2.z ] = [ B,x, B.y, B.z ]
				//
				//
				// Inverted UV matrix: 
				//		1 / (deltaUV1.x * deltaUV2.y) - (deltaUV2.x * deltaUV1.y) * [ deltaUV2.y, -deltaUV1.y ]
				//																	[ -deltaUV2.x, deltaUV1.x ]
				//
				// Example of calculation of T.x with this formulta:
				//
				// F = 1 / (deltaUV1.x * deltaUV2.y) - (deltaUV2.x * deltaUV1.y)
				//
				//	T.x = f * [(deltaUV2.y * deltaPos1.x) - (deltaUV1.y * deltaPos2.x)]

				let f = 1.0 / (deltaUV1.x * deltaUV2.y  - deltaUV1.y * deltaUV2.x )

				let tangent = new TSM.vec3([0, 0, 0])
				let bitangent = new TSM.vec3([0, 0, 0])
				tangent.x = f * ((deltaUV2.y * deltaPos1.x) - (deltaUV1.y * deltaPos2.x))
				tangent.y = f * ((deltaUV2.y * deltaPos1.y) - (deltaUV1.y * deltaPos2.y))
				tangent.z = f * ((deltaUV2.y * deltaPos1.z) - (deltaUV1.y * deltaPos2.z))
				tangent.normalize()

				bitangent.x = f * ((-deltaUV2.x * deltaPos1.x) + (deltaUV1.x * deltaPos2.x))
				bitangent.y = f * ((-deltaUV2.x * deltaPos1.y) + (deltaUV1.x * deltaPos2.y))
				bitangent.z = f * ((-deltaUV2.x * deltaPos1.z) + (deltaUV1.x * deltaPos2.z))
				bitangent.normalize()

				aTangents.push(tangent.x, tangent.y, tangent.z)
				aTangents.push(tangent.x, tangent.y, tangent.z)
				aTangents.push(tangent.x, tangent.y, tangent.z)

				aBiTangents.push(bitangent.x, bitangent.y, bitangent.z)
				aBiTangents.push(bitangent.x, bitangent.y, bitangent.z)
				aBiTangents.push(bitangent.x, bitangent.y, bitangent.z)
			}
		
		}else{
			//Should I leave empty buffers?
			aTangents.push(0, 0, 0)
			aBiTangents.push(0, 0, 0)
		}
		this._tangents = new Buffer(aTangents, BufferLayout.defaultNormalLayout(this.ctx), this.ctx)
		this._biTangents = new Buffer(aBiTangents, BufferLayout.defaultNormalLayout(this.ctx), this.ctx)
		this._tangents.load()
		this._biTangents.load()

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

	get tangents(): Buffer{
		return this._baseMesh.tangents
	}

	get bitangents(): Buffer{
		return this._baseMesh.biTangents
	}

	get drawMode(): number{
		return this._baseMesh.drawMode
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
	protected meshRaw: Array<any> = null

	constructor(context: TSglContext, meshName: string, meshProtocol: MeshProtocol, material_names: Array<string>, meshRaw: Array<any> = null){
		this.context = context
		this.meshName = meshName
		this.material_names = material_names
		this.meshProtocol = meshProtocol
		this.sections = new Array<Pair<boolean, MeshPartInstance>>()
		this.meshRaw = meshRaw
	}

	get loaded(): boolean{
		return this._loaded
	}

	draw(status: GLStatus, lights: Light[]){
		if(!this._loaded)
			return
		this.sections.forEach((section: Pair<boolean, MeshPartInstance>) => {
			if(section.key)
				section.value.material.shader.value.draw(status, section.value, lights)
		})
	}

	loadAsync(cb: (object: IAsyncLoadedObject) => void){
		this.cb = cb

		this.context.manager.getMesh(this.meshName, this.meshProtocol, this, this.meshRaw)
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