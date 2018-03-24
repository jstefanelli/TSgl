import { Texture, TSglContext, Shader} from "./gl"
import { TSM } from "../tsm"
import { Pair } from "../pair"
import { IResource, IResourceUser, IAsyncLoadedObject, ResourceType } from "../resourceManager";

export class Material implements IResource, IResourceUser, IAsyncLoadedObject{
	private _loaded: boolean = false
	private _loading: boolean = false
	textures: Array<Pair<string, Texture>> = new Array<Pair<string, Texture>>()
	uvs: Array<TSM.vec2>
	colors: Array<TSM.vec4>
	shader: Pair<string, Shader>
	shininess: number
	private cb: (object: IAsyncLoadedObject) => void
	private e: TSglContext

	get type() : ResourceType{
		return ResourceType.MATERIAL
	}

	get loaded(): boolean{
		return this._loaded
	}

	constructor(textures: Array<string>, uvs: Array<TSM.vec2>, colors: Array<TSM.vec4>, shaderName: string, engine: TSglContext){
		textures.forEach((name: string) => {
			this.textures.push(new Pair<string, Texture>(name, null))
		})
		this.uvs = uvs
		this.colors = colors
		this.e = engine
		this.shader = new Pair<string, Shader>(shaderName, null)
	}

	get isLoaded() : boolean {
		return this.loaded
	}

	loadAsync(cb: (object: IAsyncLoadedObject) => void){
		if(this._loaded)
			return
		if(this._loading)
			return
		this._loading = true
		console.log("Loading material")
		this.cb = cb
		for(var i = 0; i < this.textures.length; i++){
			let pair = this.textures[i]
			this.e.manager.getTexture(pair.key, this)
		}
		this.e.manager.getShader(this.shader.key, this)
	}

	unload(){
		for(var i = 0; i < this.textures.length; i++){
			let pair = this.textures[i]
			this.e.manager.unreferenceTexture(pair.key, this)
		}
		this.e.manager.unreferenceShader(this.shader.key, this)
	}

	resourceReady(resource: IResource, name: string, resourceType: ResourceType){
		switch(resourceType){
			case ResourceType.TEXTURE:
				for(var i = 0; i < this.textures.length; i++){
					let pair = this.textures[i]
					if(pair.key == name)
						pair.value = resource as Texture
				}
				break
			case ResourceType.SHADER:
				if(name == this.shader.key)
					this.shader.value = resource as Shader
				break
		}
		
		for(var i = 0; i < this.textures.length; i++){
			let pair = this.textures[i]
			if(pair.value == null || !pair.value.loaded)
				return
		}
		if(this.shader.value == null || !this.shader.value.loaded)
			return
		this._loaded = true
		this._loading = false
		this.cb(this)
	}
}