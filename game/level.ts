import { TSM } from "../engine/tsm"
import { Scene } from "../engine/logic/scene"
import { Camera } from "../engine/logic/camera"
import * as JQuery from "jquery"

export class Level{
	private fileAddress: string

	public Level(levelFileAddress: string){
		this.fileAddress = levelFileAddress
	}

	public loadAsync(cb: (lvl: Level) => void): void{
		

		cb(this)
	}
}