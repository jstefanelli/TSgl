import { TSM } from "../tsm"
import { Buffer, TSglContext, BufferLayout } from "../wrappers/gl"
import { Mesh, MeshPart } from "../wrappers/mesh"
import { Material } from "../wrappers/material"
import * as Engine from "../engine"
import * as JQuery from "jquery"
import { Pair } from "../pair"
import { ResourceManager, IAsyncLoadedObject } from "../resourceManager"

export interface jmdMaterialData {
	colors: Array<number>
	uvs: Array<number>
	textures: Array<string>
	shininess: number
	shaderName: string,
	version: number
}

export interface jmdSectionData {
	count: number
	offset: number
	material: jmdMaterialData
}

export interface jmdMeshData {
	vertices: Array<number>
	normals: Array<number>
	tex: Array<number>
}

export interface jmdObjectData {
	mesh: jmdMeshData
	sections: Array<jmdSectionData>
	verion: number
}

export class jmdLoader implements IAsyncLoadedObject {
	
	protected _materials: Array<Pair<string, Material>>;
	protected remoteResourceAddress: string
	protected e: TSglContext
	protected _mesh: Mesh
	protected loaded: boolean = false
	protected loading: boolean = false
	
	protected _name: string = ""

	constructor(remoteResourceAddress: string, engine: TSglContext) {
		this.remoteResourceAddress = remoteResourceAddress
		this.e = engine
		this._name = this.parseName(this.remoteResourceAddress)
	}

	get name(): string{
		return this._name
	}

	get materialNumber(): number{
		return this._materials.length
	}

	get mesh(): Mesh {
		return this._mesh
	}

	get materials(): Array<Pair<string, Material>> {
		return this._materials
	}

	private parseMat(base: jmdMaterialData): Material {
		let colors: Array<TSM.vec4> = new Array<TSM.vec4>()
		let uvs: Array<TSM.vec2> = new Array<TSM.vec2>()
		let textures: Array<string> = new Array<string>()
		for (var i = 0; i < base.colors.length; i += 4) {
			if (i + 3 > base.colors.length)
				break
			colors.push(new TSM.vec4([
				base.colors[i],
				base.colors[i + 1],
				base.colors[i + 2],
				base.colors[i + 3]
			]))
		}
		for (var i = 0; i < base.uvs.length; i += 2) {
			if (i + 1 > base.uvs.length)
				break
			uvs.push(new TSM.vec2([
				base.uvs[i],
				base.uvs[i + 1],
			]))
		}
		for (var i = 0; i < base.textures.length; i++) {
			textures.push(base.textures[i])
		}
		let shininess: number = base.shininess
		let mat = new Material(textures, uvs, colors, base.shaderName, this.e)
		mat.shininess = shininess
		return mat
	}

	private parseMesh(data: any, cb: (object: IAsyncLoadedObject) => void) {
		let object: jmdObjectData = (JSON.parse(data as string) as jmdObjectData)
		let sections: Array<MeshPart> = new Array<MeshPart>()
		this._materials = new Array<Pair<string, Material>>()
		let name : string = this.parseName(this.remoteResourceAddress)
		var i = 0;
		object.sections.forEach((section: jmdSectionData) => {
			sections.push(new MeshPart(section.count, section.offset))
			let mat = this.parseMat(section.material)
			let mat_name = name + "_" + i.toString()
			this._materials.push(new Pair<string, Material>(mat_name, mat))
			i++;
		})
		this._mesh = new Mesh(new Buffer(object.mesh.vertices, BufferLayout.defaultVertexLayout(this.e), this.e),
			new Buffer(object.mesh.normals, BufferLayout.defaultNormalLayout(this.e), this.e),
			new Buffer(object.mesh.tex, BufferLayout.defaultTexCoordLayout(this.e), this.e),
			sections, this.e)
		this.loaded = true
		cb(this)
	}

	private parseName(address: string) : string{
		let i = address.lastIndexOf("/")
		var str
		if(i == -1)
			str = address
		else
			str =  address.substr(i)

		let y = str.lastIndexOf(".json")
		if(y != -1){
			return str.substr(0, y)
		}else
			return str
	}

	loadAsync(cb: (object: IAsyncLoadedObject) => void): void {
		let that = this
		this.loading = true
		JQuery.ajax({
			url: that.remoteResourceAddress,
			dataType: "text",
			mimeType: "text/json",
			success: (data: any, textStatus: string, jqXHR: JQueryXHR): any => {
				that.parseMesh(data, cb)
			}
		})
	}

	get isLoaded(): boolean{
		return this.loaded
	}
}
