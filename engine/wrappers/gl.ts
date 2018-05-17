import { IAsyncLoadedObject, IResource, ResourceManager, ISyncLoadedObject, ResourceType } from "../resourceManager"
import { TSM } from "../tsm"
import { Material } from "./material";
import { Transform } from "./world";
import { Light, LightType, DirectionalLight, PointLight } from "./light";
import { Camera } from "../logic/camera"
import { CollisionBox } from "../collision/shapes/box";

export interface TSglContext{
	readonly gl: WebGLRenderingContext
	readonly manager: ResourceManager
}

export enum BufferMnemonics{
	VERTEX, NORMAL, TEXTURE, INDEX
}

export class BufferLayout{
	public static defaultVertexLayout(e: TSglContext) : BufferLayout{
		return new BufferLayout(0, 3, 0, e.gl.FLOAT, BufferMnemonics.VERTEX)
	}

	public static defaultNormalLayout(e: TSglContext) : BufferLayout{
		return new BufferLayout(0, 3, 0, e.gl.FLOAT, BufferMnemonics.NORMAL)
	}

	public static defaultTexCoordLayout(e: TSglContext) : BufferLayout{
		return new BufferLayout(0, 2, 0, e.gl.FLOAT, BufferMnemonics.TEXTURE)
	}

	public static defaultIndexLayout(e: TSglContext) : BufferLayout{
		return new BufferLayout(0, 1, 0, e.gl.UNSIGNED_SHORT, BufferMnemonics.INDEX)
	}

	private _offset: number
	private _size: number
	private _stride: number
	private _type: number
	private _mnemonic: BufferMnemonics

	get offset() : number{
		return this._offset
	}

	get size() : number {
		return this._size
	}

	get stride() : number {
		return this._stride
	}

	get type() : number {
		return this._type
	}

	get mnemonic() : BufferMnemonics {
		return this._mnemonic
	}

	private constructor(offset: number, size: number, stride: number, type: number, mnemonic: BufferMnemonics){
		this._offset = offset
		this._stride = stride
		this._size = size
		this._type = type
		this._mnemonic = mnemonic
	}

	public static buildFloat(engine: TSglContext, offset: number, size: number, stride: number, mnemonic: BufferMnemonics) : BufferLayout{
		return new BufferLayout(offset, size, stride, engine.gl.FLOAT, mnemonic)
	}
}


export class Buffer{
	private id: WebGLBuffer
	private loaded: boolean = false
	private _content: Array<number>
	private layout: BufferLayout
	private e: TSglContext

	get content(): number[]{
		return this._content
	}
	
	constructor(content: Array<number>, layout: BufferLayout, engine: TSglContext){
		this._content = content
		this.loaded = false
		this.layout = layout
		this.e = engine
	}

	public static duplicate(other: Buffer, newLayout: BufferLayout) : Buffer{
		console.log("Warning: Duplicating a buffer. Might cause problems with resource handling")
		if(other == null)
			return null
		if(newLayout == null)
			newLayout = other.layout
		let b : Buffer = new Buffer(other._content, newLayout, other.e)
		b.id = other.id
		b.loaded = other.loaded
		return b
	}

	load(){
		let gl = this.e.gl
		this.id = gl.createBuffer()
		gl.bindBuffer(gl.ARRAY_BUFFER, this.id)
		if(this.layout.type == gl.FLOAT)
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this._content), gl.STATIC_DRAW)
		else if(this.layout.type == gl.UNSIGNED_SHORT)
			gl.bufferData(gl.ARRAY_BUFFER, new Uint16Array(this._content), gl.STATIC_DRAW)
		this.loaded = true
	}

	bind(target: number) : boolean{
		let gl = this.e.gl
		if(!this.loaded){
			return false
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, this.id)
		gl.vertexAttribPointer(target, this.layout.size, this.layout.type, false, this.layout.stride, this.layout.offset)
		return true
	}

	bindElement() : boolean{
		let gl = this.e.gl
		if(!this.loaded){
			return false
		}
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.id)
		return true
	}

	unload(){
		if(!this.loaded){	
			return
		}
		let gl = this.e.gl
		gl.deleteBuffer(this.id)
		this.loaded = false
	}

	get isLoaded() : boolean{
		return this.loaded
	}
}

function isPot(n: number) : boolean{
	return (n != 0 && !(n & (n  - 1)))
}

export class Texture implements IAsyncLoadedObject, IResource{
	private _id: WebGLTexture
	private e: TSglContext
	private _loaded: boolean = false
	private loading: boolean = false
	private remoteResourceAddress: string = ""

	private static supportsAnisotropy: boolean = null
	private static anisotropyExtension: EXT_texture_filter_anisotropic = null

	constructor(remoteResourceAddress: string, engine: TSglContext){
		this.e = engine
		this.remoteResourceAddress = remoteResourceAddress;
	}

	get type() : ResourceType{
		return ResourceType.TEXTURE
	}

	get id() : WebGLTexture{
		return this._id
	}

	loadAsync(owner: (object: IAsyncLoadedObject) => void){
		this.loading = true
		let gl = this.e.gl
		if(Texture.supportsAnisotropy === null){
			var mz = gl.getExtension("MOZ_EXT_texture_filter_anisotropic")
			let ext = gl.getExtension("EXT_texture_filter_anisotropic") 
			if(ext != null)
				mz = ext
			if(mz != null){
				Texture.anisotropyExtension = mz
				Texture.supportsAnisotropy = true
			}else{
				let wk = gl.getExtension("WBKIT_EXT_texture_filter_anisotropic") 
				if(wk != null){
					Texture.anisotropyExtension = wk
					Texture.supportsAnisotropy = true
				}else{
					Texture.supportsAnisotropy = false
				}
			}
			if(Texture.supportsAnisotropy){
				console.log("Anisotropic filitering supported.")
			}
		}
		this._id = gl.createTexture()
		let i : HTMLImageElement = document.createElement("img")
		i.onload =  () => {
			console.log("Texture loading.");
			gl.bindTexture(gl.TEXTURE_2D, this._id)
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, i)
				
			if(isPot(i.width) && isPot(i.height)){
				gl.generateMipmap(gl.TEXTURE_2D);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
				if(Texture.supportsAnisotropy){
					gl.texParameterf(gl.TEXTURE_2D, Texture.anisotropyExtension.TEXTURE_MAX_ANISOTROPY_EXT, 4)
				}
			}else{
				console.log("Texture is not PoT")
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
			}
			this._loaded = true
			owner(this)
		}
		i.src = this.remoteResourceAddress
	}

	bind(engine: TSglContext, target: number, unit: number = 0){
		let gl = engine.gl
		if(!this._loaded)
			return
		gl.activeTexture(Math.floor(gl.TEXTURE0 + unit))
		gl.bindTexture(target, this._id)
	}

	get loaded() : boolean {
		return this._loaded;
	}

	unload(){
		if(!this._loaded){
			return
		}
		let gl = this.e.gl
		gl.deleteTexture(this._id)
		this.loading = false
		this._loaded = false
	}
}


export interface IDrawable{
	readonly material: Material

	readonly offset: number
	readonly count: number

	readonly vertices: Buffer
	readonly normals: Buffer
	readonly texCoords: Buffer
	readonly tangents: Buffer
	readonly bitangents: Buffer
	readonly drawMode: number
}

export abstract class Shader implements IResource, ISyncLoadedObject{
	protected _loaded: boolean = false
	protected e: TSglContext

	constructor(engine: TSglContext){
		this.e = engine
	}

	get type(): ResourceType{
		return ResourceType.SHADER
	}

	abstract draw(status: GLStatus, section: IDrawable, lights: Array<Light>) : void

	abstract load() : void

	abstract unload() : void

	get loaded() : boolean{
		return this._loaded
	}
	
}

export class DirLightLocations{
	direction: WebGLUniformLocation
	color: WebGLUniformLocation
	factors: WebGLUniformLocation
}

export class PointLightLocations{
	position: WebGLUniformLocation
	color: WebGLUniformLocation
	factors: WebGLUniformLocation
	functionFactors: WebGLUniformLocation
}

export class PhongShader extends Shader {

	private static instance: PhongShader = null

	public static getInstance(engine: TSglContext) : PhongShader{
		if(this.instance == null){
			this.instance = new PhongShader(engine)
		}
		return this.instance
	}

	protected vertexLoc: number
	protected normalLoc: number
	protected texCoordLoc: number
	protected tangentLoc: number
	protected bitangentLoc: number
	protected diffuseColorLoc: WebGLUniformLocation
	protected ambientColorLoc: WebGLUniformLocation
	protected specularColorLoc: WebGLUniformLocation
	protected mvpLoc: WebGLUniformLocation
	protected mvLoc: WebGLUniformLocation
	protected nrmLoc: WebGLUniformLocation
	protected diffuseMapLoc: WebGLUniformLocation
	protected normalMapLoc: WebGLUniformLocation
	protected specularMapLoc: WebGLUniformLocation
	protected diffuseMapEnableLoc: WebGLUniformLocation
	protected normalMapEnableLoc: WebGLUniformLocation
	protected specularMapEnableLoc: WebGLUniformLocation
	protected alphaLoc: WebGLUniformLocation
	protected shininessLoc: WebGLUniformLocation
	public static readonly pointLightNumber: number = 16
	protected dirLightLocs: DirLightLocations = new DirLightLocations()
	protected pointLightLocs: PointLightLocations[]
	protected pointLightsNumLoc: WebGLUniformLocation
	protected id: WebGLProgram

	private constructor(engine: TSglContext){
		super(engine)
	}

	private vsSource = "\
	precision mediump float;\
	\
	attribute vec3 vertices;\
	attribute vec3 normal;\
	attribute vec2 tex;\
	attribute vec3 tangent;\
	attribute vec3 bitangent;\
	\
	uniform mat4 mvp;\
	uniform mat4 mv;\
	uniform mat4 nrm;\
	\
	varying vec2 texCoord;\
	varying vec3 position;\
	varying mat3 TBN;\
	\
	\
	mat3 transpose(mat3 m){\
		vec3 m0 = m[0];\
		vec3 m1 = m[1];\
		vec3 m2 = m[2];\
		\
		return mat3(m0.x, m1.x, m2.x,\
			m0.y, m1.y, m2.y,\
			m0.z, m1.z, m2.z);\
	}\
	\
	mat4 transpose(mat4 m){\
		vec4 m0 = m[0];\
		vec4 m1 = m[1];\
		vec4 m2 = m[2];\
		vec4 m3 = m[3];\
		\
		return mat4(m0.x, m1.x, m2.x, m3.x,\
			m0.y, m1.y, m2.y, m3.y,\
			m0.z, m1.z, m2.z, m3.z,\
			m0.w, m1.w, m2.w, m3.w);\
	}\
	\
	mat2 transpose(mat2 m){\
		vec2 m0 = m[0];\
		vec2 m1 = m[1];\
		\
		return mat2(m0.x, m1.x,\
			m0.y, m1.y);\
	}\
	\
	void main(){\
		\
		position = (mv * vec4(vertices, 1.0)).xyz;\
		gl_Position = mvp * vec4(vertices, 1.0);\
		\
		vec3 normalDirection = normalize(nrm * vec4(normal, 0.0)).xyz;\
		vec3 tangentDirection = normalize(nrm * vec4(tangent, 0.0)).xyz;\
		vec3 bitangentDirection = normalize(nrm * vec4(bitangent, 0.0)).xyz;\
		\
		TBN = mat3(tangentDirection, bitangentDirection, normalDirection);\
		\
		texCoord = vec2(tex.x, 1.0 - tex.y);\
		\
	}"

	private fsSource = "\n\
	\n\
	precision lowp int;\n\
	precision mediump float;\n\
	\n\
	struct DirLight{\n\
		vec3 direction;\n\
		vec3 color;\n\
		vec3 factors; /* x is ambient, y is diffuse and z is specular */\n\
	};\n\
	\n\
	struct PointLight{\n\
		vec3 position;\n\
		vec3 color;\n\
		vec3 functionFactors; /* x is constant, y is linear and z is quadratic */\n\
		vec3 factors; /* x is ambient, y is diffuse and z is specular */\n\
	};\n\
	\n\
	struct Material{\n\
		vec3 diffuseColor;\n\
		vec3 specularColor;\n\
		vec3 ambientColor;\n\
		\n\
		float shininess;\n\
		float alpha;\n\
		\n\
		int diffuseEnabled;\n\
		int specularEnabled;\n\
		int normalEnabled;\n\
		\n\
		sampler2D diffuseTexture;\n\
		sampler2D specularTexture;\n\
		sampler2D normalTexture;\n\
		\n\
	};\n\
	\n\
	uniform Material mat;\n\
	\n\
	const int MAX_POINT_LIGHTS = 16;\n\
	uniform DirLight dirLight;\n\
	uniform PointLight pointLights[MAX_POINT_LIGHTS];\n\
	uniform int pointLightsNum;\n\
	\n\
	varying mat3 TBN;\n\
	varying vec2 texCoord;\n\
	varying vec3 position;\n\
	\n\
	vec3 calcDirectional(Material m, DirLight l, vec3 normal, vec3 eyeDir){\n\
		\n\
		vec3 ambient;\n\
		vec3 diffuse;\n\
		vec3 specular;\n\
		\n\
		float diffuseFactor = max(dot(l.direction, normal), 0.0);\n\
		\n\
		if(m.diffuseEnabled != 0){\n\
			vec3 texColor = texture2D(m.diffuseTexture, texCoord).xyz;\n\
			diffuse = texColor * m.diffuseColor * l.factors.y * diffuseFactor;\n\
			ambient = texColor * m.ambientColor * l.factors.x;\n\
		}else{\n\
			diffuse = m.diffuseColor * l.factors.y * diffuseFactor;\n\
			ambient = m.ambientColor * l.factors.x;\n\
		}\n\
		\n\
		float specularFactor = pow(max(dot(eyeDir, reflect(-l.direction, normal)), 0.0), m.shininess) * ((diffuseFactor >= 0.001) ? 1.0 : 0.0);\n\
		\n\
		if(m.specularEnabled != 0){\n\
			specular = texture2D(m.specularTexture, texCoord).xyz * m.specularColor;\n\
		}else{\n\
			specular = m.specularColor;\n\
		}\n\
		specular *= specularFactor;\n\
		specular *= l.factors.z;\n\
		\n\
		return ambient + diffuse + specular;\n\
	}\n\
	\n\
	vec3 calcPoint(Material m, PointLight l, vec3 normal, vec3 eyeDir, vec3 position){\n\
		vec3 ambient;\n\
		vec3 diffuse;\n\
		vec3 specular;\n\
		\n\
		vec3 lightDirection = l.position - position;\n\
		float dist = length(lightDirection);\n\
		lightDirection = normalize(lightDirection);\n\
		float attenuation = 1.0 / (l.functionFactors.x + (l.functionFactors.y * dist) + (l.functionFactors.z * dist * dist));\n\
		\n\
		float diffuseFactor = max(dot(lightDirection, normal), 0.0);\n\
		float specularFactor = pow(max(dot(eyeDir, reflect(-lightDirection, normal)), 0.0), m.shininess) * ((diffuseFactor >= 0.001) ? 1.0 : 0.0);\n\
		\n\
		if(m.diffuseEnabled != 0){\n\
			vec3 texColor = texture2D(m.diffuseTexture, texCoord).xyz;\n\
			diffuse = texColor * m.diffuseColor * l.factors.y * diffuseFactor;\n\
			ambient = texColor * m.ambientColor * l.factors.x;\n\
		}else{\n\
			diffuse = m.diffuseColor * l.factors.y * diffuseFactor;\n\
			ambient = m.ambientColor * l.factors.x;\n\
		}\n\
		\n\
		if(m.specularEnabled != 0){\n\
			specular = texture2D(m.specularTexture, texCoord).xyz * m.specularColor;\n\
		}else{\n\
			specular = m.specularColor;\n\
		}\n\
		specular *= specularFactor * l.factors.z;\n\
		specular *= l.factors.z;\n\
		\n\
		return (ambient * attenuation) + (diffuse * attenuation) + (specular * attenuation);\n\
	}\n\
	\n\
	vec3 calcNormal(){\n\
		vec3 N;\n\
		if(mat.normalEnabled != 0){\n\
			N = texture2D(mat.normalTexture, texCoord).xyz;\n\
			N = normalize((N * 2.0) - vec3(1.0));\n\
			N = normalize(TBN * N);\n\
		}else{\n\
			N = TBN[2];\n\
		}\n\
		return N;\n\
	}\n\
	void main(){\n\
		\n\
		vec3 normal = calcNormal();\n\
		vec3 eyeDir = normalize(vec3(0, 0, 0) - position);\n\
		vec3 result = calcDirectional(mat, dirLight, normal, eyeDir);\n\
		for(int i = 0; i < MAX_POINT_LIGHTS; i++){\n\
			if(i < pointLightsNum){\n\
				result += calcPoint(mat, pointLights[i], normal, eyeDir, position);\n\
			}\n\
		}\n\
		gl_FragColor = vec4(result, mat.alpha);\n\
		\n\
	}\n"

	draw(status: GLStatus, section: IDrawable, lights: Array<Light>): void {
		let gl = this.e.gl
		gl.useProgram(this.id)
		
		gl.enableVertexAttribArray(this.vertexLoc)
		gl.enableVertexAttribArray(this.normalLoc)
		gl.enableVertexAttribArray(this.texCoordLoc)
		gl.enableVertexAttribArray(this.tangentLoc)
		gl.enableVertexAttribArray(this.bitangentLoc)

		section.vertices.bind(this.vertexLoc)
		section.normals.bind(this.normalLoc)
		section.texCoords.bind(this.texCoordLoc)
		if(!section.tangents.bind(this.tangentLoc))
			console.log("Failed to bind tangents")
		if(!section.bitangents.bind(this.bitangentLoc))
			console.log("Failed to bind bitangents")

		let diffuseColor = section.material.colors[0]
		let specularColor = (section.material.colors.length >= 2 && section.material.colors[1]) ? section.material.colors[1] : new TSM.vec4([1, 1, 1, 1])
		let ambientColor = (section.material.colors.length >= 3 && section.material.colors[2]) ? section.material.colors[2] : diffuseColor.copy().divide(new TSM.vec4([10, 10, 10, 1]))

		gl.uniform3f(this.diffuseColorLoc, diffuseColor.x, diffuseColor.y, diffuseColor.z)
		gl.uniform3f(this.ambientColorLoc, ambientColor.x, ambientColor.y, ambientColor.z)
		gl.uniform3f(this.specularColorLoc, specularColor.x, specularColor.y, specularColor.z)

		gl.uniformMatrix4fv(this.mvpLoc, false, status.mvp.all())
		gl.uniformMatrix4fv(this.mvLoc, false, status.modelView.all())
		gl.uniformMatrix4fv(this.nrmLoc, false, status.normalMat.all())

		gl.uniform1f(this.shininessLoc, section.material.shininess)
		gl.uniform1f(this.alphaLoc, diffuseColor.w)

		

		if(section.material.textures.length >= 1 && section.material.textures[0].value.loaded){
			gl.uniform1i(this.diffuseMapEnableLoc, 1)
			gl.activeTexture(gl.TEXTURE0)
			gl.bindTexture(gl.TEXTURE_2D, section.material.textures[0].value.id)
			gl.uniform1i(this.diffuseMapLoc, 0)
		}else{
			gl.uniform1i(this.diffuseMapEnableLoc, 0)
		}

		if(section.material.textures.length >= 2){
			gl.uniform1i(this.normalMapEnableLoc, 1)
			gl.activeTexture(gl.TEXTURE1)
			gl.bindTexture(gl.TEXTURE_2D, section.material.textures[1].value.id)
			gl.uniform1i(this.normalMapLoc, 1)
		}else{
			gl.uniform1i(this.normalMapEnableLoc, 0)
		}

		if(section.material.textures.length >= 3){
			gl.uniform1i(this.specularMapEnableLoc, 1)
			gl.activeTexture(gl.TEXTURE2)
			gl.bindTexture(gl.TEXTURE_2D, section.material.textures[2].value.id)
			gl.uniform1i(this.specularMapLoc, 2)
		}else{
			gl.uniform1i(this.specularMapEnableLoc, 0)
		}
		
		var dirLightSet = false
		var pointLightNum = 0

		lights.forEach(l => {
			if(l.type == LightType.DIR){
				if(dirLightSet){
					console.log("More than one directional light. Skipping...")
					return
				}
				dirLightSet = true
				let dl = l as DirectionalLight
				let newDir = new TSM.vec3(status.viewMatrix.multiplyVec4(new TSM.vec4([dl.direction.x, dl.direction.y, dl.direction.z, 0])).xyz)
				gl.uniform3f(this.dirLightLocs.color, dl.color.x, dl.color.y, dl.color.z)
				gl.uniform3f(this.dirLightLocs.direction, -newDir.x, -newDir.y, -newDir.z)
				gl.uniform3f(this.dirLightLocs.factors, dl.factors.x, dl.factors.y, dl.factors.z)
				return
			}else if(l.type == LightType.POINT){
				if(pointLightNum >= PhongShader.pointLightNumber)
					return;
				let pl = l as PointLight
				let loc = this.pointLightLocs[pointLightNum]
				let newPos = new TSM.vec3(status.viewMatrix.multiplyVec4(new TSM.vec4([pl.position.x, pl.position.y, pl.position.z, 1])).xyz)
				gl.uniform3f(loc.color, pl.color.x, pl.color.y, pl.color.z)
				gl.uniform3f(loc.factors, pl.factors.x, pl.factors.y, pl.factors.z)
				gl.uniform3f(loc.functionFactors, pl.funcFactors.x, pl.funcFactors.y, pl.funcFactors.z)
				gl.uniform3f(loc.position, newPos.x, newPos.y, newPos.z)
				pointLightNum++;
			}
		});

		gl.uniform1i(this.pointLightsNumLoc, pointLightNum)

		gl.drawArrays(section.drawMode, section.offset, section.count)

		gl.disableVertexAttribArray(this.bitangentLoc)
		gl.disableVertexAttribArray(this.tangentLoc)
		gl.disableVertexAttribArray(this.texCoordLoc)
		gl.disableVertexAttribArray(this.normalLoc)
		gl.disableVertexAttribArray(this.vertexLoc)
	}

	load(): void {
		console.log("Shader loading...")
		let gl = this.e.gl

		this.id = gl.createProgram()
		let vsS = gl.createShader(gl.VERTEX_SHADER), fsS = gl.createShader(gl.FRAGMENT_SHADER)
		gl.shaderSource(vsS, this.vsSource)
		gl.compileShader(vsS)
		var stat = gl.getShaderParameter(vsS, gl.COMPILE_STATUS)
		if(!stat){
			console.log("Cannot compile vertex shader: ")
			console.log(gl.getShaderInfoLog(vsS))
			return
		}

		gl.shaderSource(fsS, this.fsSource)
		gl.compileShader(fsS)
		stat = gl.getShaderParameter(fsS, gl.COMPILE_STATUS)
		if(!stat){
			console.log("Cannot compile fragment shader: ")
			console.log(gl.getShaderInfoLog(fsS))
			return
		}

		gl.attachShader(this.id, vsS)
		gl.attachShader(this.id, fsS)
		gl.linkProgram(this.id)
		stat = gl.getProgramParameter(this.id, gl.LINK_STATUS)
		if(!stat){
			console.log("Cannot link program: ")
			console.log(gl.getProgramInfoLog(this.id))
			return
		}

		gl.deleteShader(vsS)
		gl.deleteShader(fsS)

		this.vertexLoc = gl.getAttribLocation(this.id, "vertices")
		this.normalLoc = gl.getAttribLocation(this.id, "normal")
		this.texCoordLoc = gl.getAttribLocation(this.id, "tex")

		this.tangentLoc = gl.getAttribLocation(this.id, "tangent")
		this.bitangentLoc = gl.getAttribLocation(this.id, "bitangent")

		this.mvpLoc = gl.getUniformLocation(this.id, "mvp")
		this.mvLoc = gl.getUniformLocation(this.id, "mv")
		this.nrmLoc = gl.getUniformLocation(this.id, "nrm")

		this.diffuseColorLoc = gl.getUniformLocation(this.id, "mat.diffuseColor")
		this.diffuseMapLoc = gl.getUniformLocation(this.id, "mat.diffuseTexture")
		this.diffuseMapEnableLoc = gl.getUniformLocation(this.id, "mat.diffuseEnabled")

		this.specularColorLoc = gl.getUniformLocation(this.id, "mat.specularColor")
		this.specularMapLoc = gl.getUniformLocation(this.id, "mat.specularTexture")
		this.specularMapEnableLoc = gl.getUniformLocation(this.id, "mat.speculatEnabled")

		this.ambientColorLoc = gl.getUniformLocation(this.id, "mat.ambientColor")

		this.normalMapLoc = gl.getUniformLocation(this.id, "mat.normalTexture")
		this.normalMapEnableLoc = gl.getUniformLocation(this.id, "mat.normalEnabled")

		this.dirLightLocs.color = gl.getUniformLocation(this.id, "dirLight.color")
		this.dirLightLocs.direction = gl.getUniformLocation(this.id, "dirLight.direction")
		this.dirLightLocs.factors = gl.getUniformLocation(this.id, "dirLight.factors")

		this.pointLightsNumLoc = gl.getUniformLocation(this.id, "pointLightsNum")
		
		this.pointLightLocs = new Array<PointLightLocations>(PhongShader.pointLightNumber)

		for(var i = 0; i < PhongShader.pointLightNumber; i++){
			this.pointLightLocs[i] = new PointLightLocations()
			this.pointLightLocs[i].color = gl.getUniformLocation(this.id, "pointLights[" + i + "].color");
			this.pointLightLocs[i].factors = gl.getUniformLocation(this.id, "pointLights[" + i + "].factors");
			this.pointLightLocs[i].position = gl.getUniformLocation(this.id, "pointLights[" + i + "].position");
			this.pointLightLocs[i].functionFactors = gl.getUniformLocation(this.id, "pointLights[" + i + "].functionFactors");
		}

		this.shininessLoc = gl.getUniformLocation(this.id, "mat.shininess")
		this.alphaLoc = gl.getUniformLocation(this.id, "mat.alpha")

		this._loaded = true
	}

	unload(): void {
		let gl = this.e.gl

		gl.deleteProgram(this.id)

		this._loaded = false
	}
}

export function printGLError(gl: WebGLRenderingContext, message: string = null){
	if(message != null)
		console.log("Starting GL Error dump for: " + message)
	while(true){
		let e = gl.getError()
		switch(e){
			case gl.NO_ERROR:
				return
			case gl.INVALID_ENUM:
				console.log("GL Error: Invalid_Enum")
				break;
			case gl.INVALID_OPERATION:
				console.log("GL Error: Invalid_Operation")
				break;
			case gl.INVALID_VALUE:
				console.log("GL Error: Invalid_Value")
				break;
			case gl.OUT_OF_MEMORY:
				console.log("GL Error: Out_Of_Memory")
				break;
			case gl.INVALID_FRAMEBUFFER_OPERATION:
				console.log("GL Error: Invalid_Framebuffer_Operation")
				break;
			default:
				console.log("GL Error: Unknown (" + e + ")")
				break;
		}
	}
}

export class BasicShader extends Shader{
	public static coillisionBoxColor: TSM.vec4 = new TSM.vec4([0, 1, 0, 1])

	protected vertexLoc: number
	protected colorLoc: WebGLUniformLocation
	protected mvpLoc: WebGLUniformLocation
	protected id: WebGLProgram

	protected static instance: BasicShader = null

	static getInstance(engine: TSglContext) : BasicShader{
		if(this.instance == null){
			this.instance = new BasicShader(engine)
		}
		return this.instance
	}

	private constructor(engine: TSglContext){
		super(engine)
	}

	private vsSource = "\
	attribute vec3 vertices;\
	\
	uniform mat4 mvp;\
	\
	void main(){\
		gl_Position = mvp * vec4(vertices, 1.0);\
	}"

	private fsSource = "\
	precision mediump float;\
	\
	uniform vec4 color;\
	\
	void main(){\
		gl_FragColor = color;\
	}"

	draw(status: GLStatus, section: IDrawable, lights: Array<Light>): void {
		let gl = this.e.gl

		gl.useProgram(this.id)

		gl.enableVertexAttribArray(this.vertexLoc)
		section.vertices.bind(this.vertexLoc)
		let color = section.material.colors[0]
		gl.uniform4f(this.colorLoc, color.x, color.y, color.z, color.w)
		gl.uniformMatrix4fv(this.mvpLoc, false, status.mvp.all())

		gl.drawArrays(section.drawMode, section.offset, section.count)

		gl.disableVertexAttribArray(this.vertexLoc)
	}

	load(): void {
		console.log("Shader loading...")
		let gl =  this.e.gl

		this.id = gl.createProgram()
		let vsS = gl.createShader(gl.VERTEX_SHADER), fsS = gl.createShader(gl.FRAGMENT_SHADER)
		gl.shaderSource(vsS, this.vsSource)
		gl.compileShader(vsS)
		var stat = gl.getShaderParameter(vsS, gl.COMPILE_STATUS)
		if(!stat){
			console.log("Cannot compile vertex shader: ")
			console.log(gl.getShaderInfoLog(vsS))
			return
		}

		gl.shaderSource(fsS, this.fsSource)
		gl.compileShader(fsS)
		stat = gl.getShaderParameter(fsS, gl.COMPILE_STATUS)
		if(!stat){
			console.log("Cannot compile fragment shader: ")
			console.log(gl.getShaderInfoLog(fsS))
			return
		}

		gl.attachShader(this.id, vsS)
		gl.attachShader(this.id, fsS)
		gl.linkProgram(this.id)
		stat = gl.getProgramParameter(this.id, gl.LINK_STATUS)
		if(!stat){
			console.log("Cannot link program: ")
			console.log(gl.getProgramInfoLog(this.id))
			return
		}

		gl.deleteShader(vsS)
		gl.deleteShader(fsS)

		this.vertexLoc = gl.getAttribLocation(this.id, "vertices")
		this.mvpLoc = gl.getUniformLocation(this.id, "mvp")
		this.colorLoc = gl.getUniformLocation(this.id, "color")
		this._loaded = true
	}

	unload(): void {
		let gl = this.e.gl

		gl.deleteProgram(this.id)

		this._loaded = false
	}
}

export class GLStatus{
	private static defaultViewMatrix: TSM.mat4 = TSM.mat4.lookAt(new TSM.vec3([0, 0, 0]), new TSM.vec3([0, 0, -1]), new TSM.vec3([0, 1, 0])) 
	private modelStack: Array<TSM.mat4> = new Array<TSM.mat4>()
	private _modelMatrix: TSM.mat4 = TSM.mat4.identity
	private _viewMatrix: TSM.mat4 = TSM.mat4.identity
	private _projectionMatrix: TSM.mat4 = TSM.mat4.identity
	private _frameWidth: number
	private _frameHeight: number
	private _fov: number
	private _near: number
	private _far: number

	constructor(width: number = 1280, height: number = 720, fov: number = 90.0, near: number = 0.01, far: number = 100){
		this._frameWidth = width
		this._frameHeight = height
		this._fov = fov
		this._near = near
		this._far = far
		this.updateProjectionMatrix()
		this.viewMatrix = GLStatus.defaultViewMatrix.copy()
		this.updateBuiltIns()
	}

	private updateProjectionMatrix(){
		this._projectionMatrix = TSM.mat4.perspective(this._fov, this._frameWidth / this._frameHeight, this._near, this._far)
	}

	set frameWidth(width: number){
		this._frameWidth = width
		this.updateProjectionMatrix()
	}

	get frameWidth(): number{
		return this._frameWidth
	}

	set frameHeight(height: number){
		this._frameHeight = height
		this.updateProjectionMatrix()
	}

	get frameHeight(): number{
		return this._frameHeight
	}

	set fov(fovDeg: number){
		this._fov = fovDeg
		this.updateProjectionMatrix()
	}

	get fov(): number{
		return this._fov
	}

	set farPlane(far: number){
		this._far = far
		this.updateProjectionMatrix()
	}

	get farPlane(): number{
		return this._far
	}

	set nearPlane(near: number){
		this._near = near
		this.updateProjectionMatrix()
	}

	get nearPlane(){
		return this._near
	}

	get modelMatrix() : TSM.mat4{
		return this._modelMatrix
	}

	set modelMatrix(mat: TSM.mat4){
		this._modelMatrix = mat
		this.updateBuiltIns()
	}
	
	get viewMatrix() : TSM.mat4{
		return this._viewMatrix
	}

	set viewMatrix(mat: TSM.mat4){
		this._viewMatrix = mat
		this.updateBuiltIns()
	}

	get projectionMatrix() : TSM.mat4 {
		return this._projectionMatrix
	}

	set projectionMatrix(mat: TSM.mat4){
		this._projectionMatrix = mat
		this.updateBuiltIns()
	}

	get modelView() : TSM.mat4{
		return this._modelView
	}

	get normalMat() : TSM.mat4 {
		return this._normalMat
	}

	get mvp() : TSM.mat4 {
		return this._mvp
	}

	_frames: number = 0
	_sinFrames: number = 0
	_cosFrames: number = 1

	get frames(): number {
		return this._frames
	}

	set frames(f: number){
		this._frames = f
		this._cosFrames = Math.cos(this._frames)
		this._sinFrames = Math.sin(this._frames)
	}

	get sinFrames() : number {
		return this._sinFrames
	}

	get cosFrames() : number {
		return this._cosFrames
	}

	private _modelView: TSM.mat4
	private _normalMat: TSM.mat4
	private _mvp: TSM.mat4

	quatFromEulerAngles(e: TSM.vec3) : TSM.quat{
		let q = new TSM.quat()		
		let cy = Math.cos(e.y * 0.5);
		let sy = Math.sin(e.y * 0.5);
		let cr = Math.cos(e.z * 0.5);
		let sr = Math.sin(e.z * 0.5);
		let cp = Math.cos(e.x * 0.5);
		let sp = Math.sin(e.x * 0.5);
		q.w = cy * cr * cp + sy * sr * sp;
		q.x = cy * sr * cp - sy * cr * sp;
		q.y = cy * cr * sp + sy * sr * cp;
		q.z = sy * cr * cp - cy * sr * sp;
		return q;
	}

	applyCamera(c: Camera){
		this._fov = c.fov
		this._near = c.nearPlane
		this._far = c.farPlane
		this.updateProjectionMatrix()
		this.viewMatrix = GLStatus.defaultViewMatrix.copy()
		this.viewMatrix.rotate(-c.orientation.y, new TSM.vec3([0, 1, 0]))
		this.viewMatrix.rotate(-c.orientation.x, new TSM.vec3([1, 0, 0]))
		this.viewMatrix.rotate(-c.orientation.z, new TSM.vec3([0, 0, 1]))
		this.viewMatrix.translate(c.position.copy().negate())
		this.updateBuiltIns()
	}

	applyTransformToModel(t: Transform){
		this.modelStack.push(this._modelMatrix)
		let myMat = this._modelMatrix.copy()

		myMat.translate(t.position)
		myMat.rotate(t.orientation.y, new TSM.vec3([0, 1, 0]))
		myMat.rotate(t.orientation.x, new TSM.vec3([1, 0, 0]))
		myMat.rotate(t.orientation.z, new TSM.vec3([0, 0, 1]))
		myMat.scale(t.scale)
		this._modelMatrix = myMat
		this.updateBuiltIns()
	}

	revertLastModelTransform(){
		this._modelMatrix = (this.modelStack.length > 0) ? this.modelStack.pop() : this._modelMatrix
		this.updateBuiltIns()
	}

	private updateBuiltIns(){
		this._modelView = this._viewMatrix.copy().multiply(this._modelMatrix)
		this._mvp = this._projectionMatrix.copy().multiply(this._modelView)
		this._normalMat = this._modelView.copy().inverse().transpose()
	}
}
