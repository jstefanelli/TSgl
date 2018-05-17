import { TSM } from "../engine/tsm"
import { Engine, KeyboardCallback } from "../engine/engine"
import { Scene, GameObject, Hierarchy } from "../engine/logic/scene"
import { Initializer } from "../engine/init"
import { Level } from "./level";

export class Game implements KeyboardCallback{
	
	private _engine: Engine
	private currentLevel: Level
	timeScale: number = 1.0

	public constructor(container_id: String){
		this._engine = Initializer.init(container_id)
		this._engine.keyboardCB = this
	}

	public gotoLevel(levelFileAddress: string){
		this.currentLevel = null
		let l = new Level(levelFileAddress, this._engine)
		l.loadAsync((level: Level) => {
			console.log("[MAIN] Level Loaded")
			this.currentLevel = l
		})
	}

	private lastFrameTime: number = 0

	private renderAndUpdate(){
		let time = new Date().getTime()
		let delta = (this.lastFrameTime != 0 ? (time - this.lastFrameTime) / 1000 : 1 / 60) * this.timeScale
		this.lastFrameTime = time
		this.update(delta)
		this.draw(delta)
	}

	private update(deltaTime: number){
		//console.log("[MAIN] DeltaTime: " + deltaTime)
		if(this.currentLevel == null)
			return
		this.currentLevel.update(deltaTime)
	}

	private draw(deltaTime: number){
		if(this.currentLevel == null){
			this._engine.draw()
			return
		}
		this.currentLevel.draw(deltaTime)
	}

	private drawInterval: number = null

	public start(){
		if(this.drawInterval != null){
			console.log("[MAIN] Already running.")
			return
		}
		console.log("[MAIN] Starting render interval.")
		window.setInterval(() : void => {
			this.renderAndUpdate();
		}, 33)
	}

	public stop(){
		if(this.drawInterval == null){
			console.log("[MAIN] Not running.")
			return
		}
		clearInterval(this.drawInterval)
		this.drawInterval = null
	}

	//region Keyboard

	private handleSpecialKeyDown(key: number) : boolean{
		return false
	}

	private handleSpecialKeyUp(key: number) : boolean{
		return false
	}

	private handleSpecialKeyPress(key: number) : boolean{
		return false
	}

	onKeyDown(key: number) {
		if(!this.handleSpecialKeyDown(key)){
			if(this.currentLevel != null)
				this.currentLevel.onKeyDown(key)
		}
	}

	onKeyUp(key: number) {
		if(!this.handleSpecialKeyUp(key)){
			if(this.currentLevel != null)
				this.currentLevel.onKeyUp(key)
		}
	}

	onKeyPress(key: number) {
		if(!this.handleSpecialKeyPress(key)){
			if(this.currentLevel != null)
				this.currentLevel.onKeyPress(key)
		}
	}

	//endregion

}