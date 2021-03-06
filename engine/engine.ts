import * as JQuery from "jquery"
import { GLStatus, Shader, Texture, Buffer, TSglContext } from "./wrappers/gl"
import { Material } from "./wrappers/material"
import { Transform } from "./wrappers/world"
import { TSM } from "./tsm"
import { ResourceManager } from "./resourceManager";
import { Scene } from "./logic/scene"

export class Engine implements TSglContext{
	private glc: JQuery
	private textc: JQuery
	private container: JQuery
	private _gl: WebGLRenderingContext
	private textd: CanvasRenderingContext2D
	private loaded: Boolean = false
	private currentScene: Scene = null
	private nextScene: Scene = null
	private _manager: ResourceManager 

	get manager() : ResourceManager{
		return this._manager
	}

	constructor(glCanvas: JQuery, textCanvas: JQuery, container: JQuery){
		this.glc = glCanvas
		this.textc = textCanvas
		this.container = container
		this._manager = new ResourceManager(this)

		const attribs: WebGLContextAttributes = {
			alpha: true,
			depth: true,
			stencil: false
		}

		this._gl = (this.glc[0] as HTMLCanvasElement).getContext("experimental-webgl", attribs)
		this.textd = (this.textc[0] as HTMLCanvasElement).getContext("2d")
		let that = this


		$(window).on("resize", (event: JQuery.Event) => {
				console.log("Resizing...")
				
				let c = that.glc[0] as HTMLCanvasElement
				c.width = that.glc[0].clientWidth
				c.height = that.glc[0].clientHeight
				that.gl.viewport(0, 0, c.width, c.height)
				let c2 = that.textc[0] as HTMLCanvasElement
				c2.width = that.textc[0].clientWidth
				c2.height = that.textc[0].clientHeight

				if(this.currentScene != null){
					this.currentScene.glStatus.frameWidth = c.width
					this.currentScene.glStatus.frameHeight = c.height
				}
			}
		)
		
		this.container.on("keydown", (event: JQuery.Event) => {
			console.log("Keydown..." + event.which)
			if(this.currentScene == null)
				return
			switch(event.which){
				case 87:
					this.currentScene.activeCamera.move(new TSM.vec3([0, 0, -0.1]))
					break
				case 83:
					this.currentScene.activeCamera.move(new TSM.vec3([0, 0, 0.1]))
					break
			}
		})

		let c = this.glc[0] as HTMLCanvasElement
		c.width = this.glc[0].clientWidth
		c.height = this.glc[0].clientHeight
		this._manager.loadDefaults()
		this._gl.viewport(0, 0, c.width, c.height)

		this._gl.enable(this.gl.DEPTH_TEST)
		this._gl.depthFunc(this.gl.LEQUAL)

		this._gl.enable(this.gl.BLEND)
		this._gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

		this._gl.clearColor(0, 0, 0, 1)

		this._gl.enable(this.gl.CULL_FACE)
		this._gl.cullFace(this.gl.BACK)
	}

	draw(){
		
		this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT)
		if(this.currentScene != null)
			this.currentScene.draw()
		
		this.textd.clearRect(0, 0, 1000, 1000)
	}

	get gl() : WebGLRenderingContext{
		return this._gl
	}

	gotoNextScene(next: Scene){
		this.nextScene = next
		if(this.currentScene != null)
			this.currentScene.unload()
		this.currentScene = null
		this.nextScene.loadAsync()
	}

	onSceneLoaded(next: Scene){
		this.currentScene = next
	}
}