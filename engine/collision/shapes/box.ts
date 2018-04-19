import { TSM } from "../../tsm"
import { Transform } from "../../wrappers/world"
import { CollisionWorld } from "../collisionWorld";

export class CollisionBox{
	transform: Transform
	subShapes: CollisionBox[]
	isStatic: boolean

	collides2D(other: CollisionBox){
		
	}

	collides3D(other: CollisionBox){

	}
}