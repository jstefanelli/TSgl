import { IGameObjectItem, GameObject} from "../logic/scene"
import { TSglContext, GLStatus } from "../wrappers/gl";
import { Collider } from "./collisionWorld";
import { Transform } from "../wrappers/world";

export class CollisionItem implements IGameObjectItem{

	private static ColliderTag = "collider"

	private _loaded = false
	private _collider : Collider = null
	private _parent : GameObject = null
	private _offsetTransform: Transform = null

	constructor(object: GameObject, collider: Collider, offsetTransform: Transform = Transform.identityTransform){
		if(object.getItem(CollisionItem.ColliderTag) != null)
			throw new Error("Trying to add CollisionItem to Gameobject that already has a collider")
		this._parent = object
		this._parent.addItem(CollisionItem.ColliderTag, this)
		this._collider = collider
		this._offsetTransform = offsetTransform
	}

	get loaded() : boolean{
		return  this._loaded
	}

	load(context: TSglContext){
		this._collider.load()
	}

	unload(){
		this._collider.unload()
	}

	update(delta: number){
		this._parent.transform.position = this._collider.transform.position.copy().add(this._offsetTransform.position)
		this._parent.transform.orientation = this._collider.transform.orientation.copy().add(this._offsetTransform.orientation)
	}

	draw(status: GLStatus){
		//Not drawing because Collision Debug draw is handled by CollisionWorld
	}
}