import { IAsyncLoadedObject, IResource, ResourceManager, ISyncLoadedObject, ResourceType } from "../resourceManager"
import { TSM } from "../tsm"
import { Material } from "./material";
import { Transform } from "./world";

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
	private content: Array<number>
	private layout: BufferLayout
	private e: TSglContext
	
	constructor(content: Array<number>, layout: BufferLayout, engine: TSglContext){
		this.content = content
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
		let b : Buffer = new Buffer(other.content, newLayout, other.e)
		b.id = other.id
		b.loaded = other.loaded
		return b
	}

	load(){
		let gl = this.e.gl
		this.id = gl.createBuffer()
		gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.id)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.content), gl.STATIC_DRAW)
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
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
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

	abstract draw(status: GLStatus, section: IDrawable, lights: Array<TSM.vec4>) : void

	abstract load() : void

	abstract unload() : void

	get loaded() : boolean{
		return this._loaded
	}
	
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
	protected shininessLoc: WebGLUniformLocation
	protected lightPos0Loc: WebGLUniformLocation
	protected lightPos1Loc: WebGLUniformLocation
	protected lightPos2Loc: WebGLUniformLocation
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
	\
	uniform mat4 mvp;\
	uniform mat4 mv;\
	uniform mat4 nrm;\
	\
	varying vec3 normalDirection;\
	varying vec2 texCoord;\
	varying vec3 position;\
	\
	void main(){\
		\
		position = (mv * vec4(vertices, 1.0)).xyz;\
		gl_Position = mvp * vec4(vertices, 1.0);\
		\
		normalDirection = normalize(nrm * vec4(normal, 0.0)).xyz;\
		\
		texCoord = vec2(tex.x, 1.0 - tex.y);\
		\
	}"

	private fsSource = "\n\
	precision lowp int;\n\
	precision mediump float;\n\
	\n\
	uniform vec4 diffuseColor;\n\
	uniform vec4 specularColor;\n\
	uniform vec4 ambientColor;\n\
	uniform float shininess;\n\
	\n\
	uniform sampler2D diffuseTexture;\n\
	uniform sampler2D specularTexture;\n\
	uniform sampler2D normalTexture;\n\
	\n\
	uniform int diffuseEnabled;\n\
	uniform int normalEnabled;\n\
	uniform int specularEnabled;\n\
	\n\
	uniform vec4 lightPosition0;\n\
	uniform vec4 lightPosition1;\n\
	uniform vec4 lightPosition2;\n\
	\n\
	varying vec3 normalDirection;\n\
	varying vec2 texCoord;\n\
	varying vec3 position;\n\
	\n\
	vec3 getLightDirection(vec3 lightPosition){\n\
		return normalize(lightPosition - position);\n\
	}\n\
	\n\
	vec4 calcAmbient(){\n\
		vec4 diffuse;\n\
		if(diffuseEnabled != 0){\n\
			diffuse = texture2D(diffuseTexture, texCoord) * diffuseColor;\n\
		}else{\n\
			diffuse = vec4(1, 1, 1, 1);\n\
		}\n\
		return ambientColor * diffuse;\
	}\n\
	\n\
	vec3 calcDiffuse(vec3 lightDirection, vec3 adjustedNormal){\n\
		float diffuseFactor = max(dot(lightDirection, adjustedNormal), 0.0);\n\
		vec4 diffuse;\n\
		if(diffuseEnabled != 0){\n\
			diffuse = texture2D(diffuseTexture, texCoord) * diffuseColor;\n\
		}else{\n\
			diffuse = diffuseColor;\n\
		}\n\
		return diffuse.rgb * diffuseFactor;\n\
	}\n\
	\n\
	vec3 calcSpecular(vec3 lightDirection, vec3 adjustedNormal, vec3 eyeDir){\n\
		\n\
		float diffuseFactor = dot(lightDirection, adjustedNormal) >= 0.001 ? 1.0 : 0.0;\n\
		float specularFactor = pow(max(dot(eyeDir, reflect(-lightDirection, adjustedNormal)), 0.0), shininess) * diffuseFactor;\n\
		\n\
		vec4 specular;\n\
		if(specularEnabled != 0){\n\
			specular = texture2D(specularTexture, texCoord) * specularColor;\n\
		}else{\n\
			specular = specularColor;\n\
		}\n\
		return specular.rgb * specularFactor;\n\
		\n\
	}\n\
	\n\
	void main(){\n\
		\n\
		vec3 eyeDir = normalize(vec3(0, 0, 0) - position);\n\
		vec4 ambient = calcAmbient();\n\
		vec3 lightDirection0 = getLightDirection(lightPosition0.xyz);\n\
		vec3 diffuse0 = calcDiffuse(lightDirection0, normalDirection);\n\
		vec3 specular0 = calcSpecular(lightDirection0, normalDirection, eyeDir);\n\
		gl_FragColor = vec4((diffuse0.xyz * lightPosition0.a) + ambient.xyz + (specular0 * lightPosition0.a), diffuseColor.a);\n\
		\n\
	}\n"

	draw(status: GLStatus, section: IDrawable, lights: Array<TSM.vec4>): void {
		let gl = this.e.gl

		gl.useProgram(this.id)

		gl.enableVertexAttribArray(this.vertexLoc)
		gl.enableVertexAttribArray(this.normalLoc)
		gl.enableVertexAttribArray(this.texCoordLoc)

		section.vertices.bind(this.vertexLoc)
		section.normals.bind(this.normalLoc)
		section.texCoords.bind(this.texCoordLoc)


		let diffuseColor = section.material.colors[0]
		let specularColor = (section.material.colors.length >= 2 && section.material.colors[1]) ? section.material.colors[1] : new TSM.vec4([1, 1, 1, 1])
		let ambientColor = (section.material.colors.length >= 3 && section.material.colors[2]) ? section.material.colors[2] : diffuseColor.copy().divide(new TSM.vec4([10, 10, 10, 1]))

		gl.uniform4f(this.diffuseColorLoc, diffuseColor.x, diffuseColor.y, diffuseColor.z, diffuseColor.w)
		gl.uniform4f(this.ambientColorLoc, ambientColor.x, ambientColor.y, ambientColor.z, ambientColor.w)
		gl.uniform4f(this.specularColorLoc, specularColor.x, specularColor.y, specularColor.z, specularColor.w)

		gl.uniformMatrix4fv(this.mvpLoc, false, status.mvp.all())
		gl.uniformMatrix4fv(this.mvLoc, false, status.modelView.all())
		gl.uniformMatrix4fv(this.nrmLoc, false, status.normalMat.all())

		gl.uniform1f(this.shininessLoc, section.material.shininess)

		if(section.material.textures.length >= 1 && section.material.textures[0].value.loaded){
			gl.uniform1i(this.diffuseMapEnableLoc, 1)
			gl.activeTexture(gl.TEXTURE0)
			gl.bindTexture(gl.TEXTURE_2D, section.material.textures[0].value.id)
			gl.uniform1i(this.diffuseMapLoc, 0)
		}else{
			gl.uniform1i(this.diffuseMapEnableLoc, 0)
		}

		if(section.material.textures.length >= 2){
			console.log("Enabling normal map")
			gl.uniform1i(this.normalMapEnableLoc, 1)
			gl.activeTexture(gl.TEXTURE1)
			gl.bindTexture(gl.TEXTURE_2D, section.material.textures[1].value.id)
			gl.uniform1i(this.normalMapLoc, 1)
		}else{
			gl.uniform1i(this.normalMapEnableLoc, 0)
		}

		if(section.material.textures.length >= 3){
			console.log("Enabling specular map")
			gl.uniform1i(this.specularMapEnableLoc, 1)
			gl.activeTexture(gl.TEXTURE2)
			gl.bindTexture(gl.TEXTURE_2D, section.material.textures[2].value.id)
			gl.uniform1i(this.specularMapLoc, 2)
		}else{
			gl.uniform1i(this.specularMapEnableLoc, 0)
		}

		if(lights.length > 0){
			let light = lights[0].copy()
			light.w = 1
			light = status.viewMatrix.multiplyVec4(light)
			gl.uniform4f(this.lightPos0Loc, light.x, light.y, light.z, lights[0].w)
		}

		if(lights.length > 1){
			let light = lights[1].copy()
			light.w = 1
			light = status.viewMatrix.multiplyVec4(light)
			gl.uniform4f(this.lightPos1Loc, light.x, light.y, light.z, lights[1].w)
		}

		if(lights.length > 2){
			let light = lights[2].copy()
			light.w = 1
			light = status.viewMatrix.multiplyVec4(light)
			gl.uniform4f(this.lightPos2Loc, light.x, light.y, light.z, lights[2].w)
		}

		gl.drawArrays(gl.TRIANGLES, section.offset, section.count)

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

		this.mvpLoc = gl.getUniformLocation(this.id, "mvp")
		this.mvLoc = gl.getUniformLocation(this.id, "mv")
		this.nrmLoc = gl.getUniformLocation(this.id, "nrm")

		this.diffuseColorLoc = gl.getUniformLocation(this.id, "diffuseColor")
		this.diffuseMapLoc = gl.getUniformLocation(this.id, "diffuseTexture")
		this.diffuseMapEnableLoc = gl.getUniformLocation(this.id, "diffuseEnabled")

		this.specularColorLoc = gl.getUniformLocation(this.id, "specularColor")
		this.specularMapLoc = gl.getUniformLocation(this.id, "specularTexture")
		this.specularMapEnableLoc = gl.getUniformLocation(this.id, "speculatEnabled")

		this.ambientColorLoc = gl.getUniformLocation(this.id, "ambientColor")

		this.normalMapLoc = gl.getUniformLocation(this.id, "normalTexture")
		this.normalMapEnableLoc = gl.getUniformLocation(this.id, "normalEnabled")

		this.lightPos0Loc = gl.getUniformLocation(this.id, "lightPosition0")
		this.lightPos1Loc = gl.getUniformLocation(this.id, "lightPosition1")
		this.lightPos2Loc = gl.getUniformLocation(this.id, "lightPosition2")

		this.shininessLoc = gl.getUniformLocation(this.id, "shininess")

		this._loaded = true
	}

	unload(): void {
		let gl = this.e.gl

		gl.deleteProgram(this.id)

		this._loaded = false
	}
}

export class BasicShader extends Shader{
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

	draw(status: GLStatus, section: IDrawable, lights: Array<TSM.vec4>): void {
		let gl = this.e.gl

		gl.useProgram(this.id)

		gl.enableVertexAttribArray(this.vertexLoc)
		section.vertices.bind(this.vertexLoc)
		let color = section.material.colors[0]
		gl.uniform4f(this.colorLoc, color.x, color.y, color.z, color.w)
		gl.uniformMatrix4fv(this.mvpLoc, false, status.mvp.all())

		gl.drawArrays(gl.TRIANGLES, section.offset, section.count)

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
	private modelStack: Array<TSM.mat4> = new Array<TSM.mat4>()
	private _modelMatrix: TSM.mat4 = TSM.mat4.identity
	private _viewMatrix: TSM.mat4 = TSM.mat4.identity
	private _projectionMatrix: TSM.mat4 = TSM.mat4.identity

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
		this._modelMatrix = this.modelStack.pop()
		this.updateBuiltIns()
	}

	private updateBuiltIns(){
		this._modelView = this._viewMatrix.copy().multiply(this._modelMatrix)
		this._mvp = this._projectionMatrix.copy().multiply(this._modelView)
		this._normalMat = this._modelView.copy().inverse().transpose()
	}
}
