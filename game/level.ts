import { TSM } from "../engine/tsm"
import { Scene, GameObject } from "../engine/logic/scene"
import { Camera } from "../engine/logic/camera"
import * as JQuery from "jquery"
import { CollisionWorld } from "../engine/collision/collisionWorld";
import { TSglContext } from "../engine/wrappers/gl";
import { Engine, SceneCallback } from "../engine/engine";
import { Game } from "./main";
import { MeshPart } from "../engine/wrappers/mesh";
import { MeshProtocol } from "../engine/resourceManager";
import { CollisionBox } from "../engine/collision/shapes/box";


export class Level implements SceneCallback{
	private fileAddress: string
	private world: CollisionWorld
	private scene: Scene
	private _engine: Engine
	private _loaded: boolean = false
	private gObject: GameObject = null
	private gObjectId: string
	private demoBox: CollisionBox

	public constructor(levelFileAddress: string, engine: Engine){
		this.fileAddress = levelFileAddress
		this._engine = engine
	}

	private loadCB: (lvl: Level) => void = null

	public loadAsync(cb: (lvl: Level) => void): void{
		this.world = new CollisionWorld()
		this.scene = new Scene(this._engine, this._engine)
		
		this.gObjectId = this.scene.rootHierarchy.makeGameObject("assets/my_plane.json", MeshProtocol.JMD, ["/my_plane_0"])
		let subObject = this.scene.rootHierarchy.getSubObject(this.gObjectId)
		if(subObject instanceof GameObject)
			this.gObject = subObject
		else
			throw new Error("Given incorrect gameObject (actually a Hierarchy or null)")

		this.gObject.transform.orientation.x = -Math.PI / 2
		this.scene.activeCamera.position.y = 0.5
		this.loadCB = cb

		this.demoBox = new CollisionBox(this._engine)

		this.world.addCollider("test", this.demoBox)

		this._engine.sceneCB = this
		this._engine.gotoNextScene(this.scene)
	}

	public draw(deltaTime: number){
		this._engine.draw()
		this._engine.newDrawLayer()
		this.world.drawDebugWorld(this.scene.glStatus, this._engine)
	}

	public update(deltaTime: number){
		this.gObject.transform.orientation.y += Math.PI * deltaTime / 2;
		this.demoBox.transform.orientation.y += Math.PI * deltaTime / 2;
		this.world.step(deltaTime)
	}

	public onSceneLoaded(scene: Scene){
		if(scene == this.scene){
			this._loaded = true
			if(this.loadCB != null)
				this.loadCB(this)
		}
	}

	public onSceneUnloaded(scene: Scene){
		//Don't care TBH
	}
}