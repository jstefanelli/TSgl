import { Map } from "./map"
import { Texture, Shader, Buffer, TSglContext, BasicShader, PhongShader } from "./wrappers/gl"
import { Material } from "./wrappers/material";
import { Mesh, MeshPart } from "./wrappers/mesh"
import { jmdLoader } from "./fileTypes/jmd"
import { Pair} from "./pair"

export enum MeshProtocol{
	ANY, JMD, OBJ, FBX, BUILT_IN, RAW
}

export enum ResourceType{
	TEXTURE, MESH, SHADER, MATERIAL
}

export interface IResourceUser{
	resourceReady(resource: IResource, resourceName: string, resouseType: ResourceType)
}

export interface IResource{
	readonly loaded: boolean
	readonly type: ResourceType
	unload()
}

export interface IAsyncLoadedObject{
	loadAsync(cb: (object: IAsyncLoadedObject) => void)
}

export interface ISyncLoadedObject{
	load()
}

export class ReferenceHolder<T extends IResource>{
	value: T
	type: ResourceType
	name: string
	private _references: Array<IResourceUser>

	get references(): Array<IResourceUser>{
		return this._references
	}

	constructor(val: T, type: ResourceType, name: string){
		this.value = val
		this._references = new Array<IResourceUser>()
		this.type = type
		this.name = name
	}

	addReference(user: IResourceUser) : boolean{
		if(this._references.indexOf(user) != -1)
			return false
		this._references.push(user)
		if(this.value.loaded)
			user.resourceReady(this.value, this.name, this.type)
		return true
	}

	dropReference(user: IResourceUser) : boolean{
		let index = this._references.indexOf(user)
		if(index == -1)
			return false
		this._references.splice(index, 1)
		if(this._references.length == 0)
			this.value.unload()
		return true
	}
}

export class ResourceManager{
	protected textures: Map<string, ReferenceHolder<Texture>> = new Map<string, ReferenceHolder<Texture>>()
	protected materials: Map<string, ReferenceHolder<Material>> = new Map<string, ReferenceHolder<Material>>()
	protected shaders: Map<string, ReferenceHolder<Shader>> = new Map<string, ReferenceHolder<Shader>>()
	protected meshes: Map<string, ReferenceHolder<Mesh>> = new Map<string, ReferenceHolder<Mesh>>()
	protected e: TSglContext

	constructor(e: TSglContext){
		this.e = e
	}

	loadDefaults(){
		
	}

	getTexture(address: string, user: IResourceUser) : void{
		if(this.textures.has(address)){
			let ref = this.textures.get(address)
			ref.addReference(user)
		}else{
			let val = new Texture(address, this.e)
			let ref = new ReferenceHolder(val, ResourceType.TEXTURE, address);
			ref.addReference(user)
			this.textures.set(address, ref)
			val.loadAsync((object: Texture) => {
				ref.references.forEach((user: IResourceUser) => {
					user.resourceReady(object, address, ResourceType.TEXTURE)
				})
			})
		}
	}

	unreferenceTexture(address: string, user: IResourceUser){
		if(!this.textures.has(address))
			return
		let ref = this.textures.get(address)
		ref.dropReference(user)
	}

	getShader(name: string, user: IResourceUser) : void{
		if(this.shaders.has(name)){
			let ref = this.shaders.get(name)
			ref.addReference(user)
		}else{
			var s : Shader
			switch(name){
				case "phong":
					s = PhongShader.getInstance(this.e)
					break
				default:
					name = "basic"
					s = BasicShader.getInstance(this.e)
					break
			}
			s.load()
			let ref = new ReferenceHolder<Shader>(s, ResourceType.SHADER, name)
			ref.addReference(user)
			this.shaders.set(name, ref)
		}
	}

	unreferenceShader(name: string, user: IResourceUser){
		if(!this.shaders.has(name))
			return
		let ref = this.shaders.get(name)
		ref.dropReference(user)
	}

	registerMaterial(name: string, mat: Material){
		if(this.materials.has(name))
			throw new Error("Material with that name already exists")
		let ref = new ReferenceHolder<Material>(mat, ResourceType.MATERIAL, name)
		this.materials.set(name, ref)
		mat.loadAsync((object) => {
			this.materials.get(name).references.forEach((ref) => {
				ref.resourceReady(mat, name, ResourceType.MATERIAL)
			})
		})
	}

	getMaterial(name: string, user: IResourceUser){
		if(!this.materials.has(name))
			throw new Error("Material not found.")
		let ref = this.materials.get(name)
		ref.addReference(user)
	}

	unreferenceMaterial(name: string, user: IResourceUser){
		if(!this.materials.has(name))
			return
		let ref = this.materials.get(name)
		ref.dropReference(user)
	}

	dropMaterial(name: string){
		if(!this.materials.has(name))
			return
		let ref = this.materials.get(name)
		if(ref.references.length == 0)
			this.materials.delete(name)
		else
			console.error("Cannot delete material. Still referenced by something")
	}

	getMesh(name: string, protocol: MeshProtocol, user: IResourceUser, rawData?: any[]){
		if(this.meshes.has(name)){
			let ref = this.meshes.get(name)
			ref.addReference(user)
		}else{
			switch(protocol){
				case MeshProtocol.BUILT_IN:
				case MeshProtocol.ANY:
					console.log("Not implemented.")
					return
				case MeshProtocol.JMD:
					let loader = new jmdLoader(name, this.e)
					loader.loadAsync((object: IAsyncLoadedObject) => {
						let ldr = (object as jmdLoader)
						ldr.materials.forEach((pair: Pair<string, Material>) => {
							console.log("Registerin built-in material: " + pair.key)
							console.log(pair.value)
							this.registerMaterial(pair.key, pair.value)
						})
						ldr.mesh.load()
						let ref = new ReferenceHolder<Mesh>(ldr.mesh, ResourceType.MESH, name)
						ref.addReference(user)
						this.meshes.set(name, ref)
					})
					break
				case MeshProtocol.RAW:
					let mesh = new Mesh(rawData[0] as Buffer, rawData[1] as Buffer, rawData[2] as Buffer, rawData[3] as MeshPart[], this.e, (rawData.length > 4) ? rawData[4] as number : null)
					mesh.load()
					let ref = new ReferenceHolder<Mesh>(mesh, ResourceType.MESH, name)
					ref.addReference(user)
					this.meshes.set(name, ref)
					break
				case MeshProtocol.OBJ:
					//TODO: Handle OBJ mesh generation
					break
			}
		}
	}

	unreferenceMesh(name: string, user: IResourceUser){
		if(!this.meshes.has(name))
			return
		this.meshes.get(name).dropReference(user)
	}
}