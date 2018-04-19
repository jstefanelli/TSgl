import { TSM } from "../engine/tsm"
import { Engine, KeyboardCallback } from "../engine/engine"
import { Scene, GameObject, Hierarchy } from "../engine/logic/scene"
import { Initializer } from "../engine/init"

export class Game implements KeyboardCallback{
	
	private _engine: Engine
	

	public Game(container_id: String){
		this._engine = Initializer.init(container_id)
		this._engine.keyboardCB = this
	}

	public gotoLevel(levelFileAddress: string){
		
	}

	//region Keyboard

	onKeyDown(key: number) {
		
	}

	onKeyUp(key: number) {
		
	}

	onKeyPress(key: number) {
		
	}

	//endregion
}