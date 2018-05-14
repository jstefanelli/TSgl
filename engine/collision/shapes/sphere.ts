import { TSM } from "../../tsm"
import { Transform } from "../../wrappers/world"
import { CollisionWorld } from "../collisionWorld";
import { CollisionBox } from "./box"
import { GLStatus, TSglContext, Buffer, BufferLayout } from "../../wrappers/gl";
import { Light } from "../../wrappers/light";

export class CollisionSphere{
	public static staticLoaded: boolean = false
	public static vertBuffer: Buffer = null
	public static indexBuffer: Buffer = null

	public static staticLoad(e: TSglContext){
		//TODO: Implement this
		/*if(this.staticLoaded)
			return

		let vertices = [
			-0.5, -0.5, 0.5,
			0.5, -0.5, 0.5,
			-0.5, 0.5, 0.5,
			0.5, 0.5, 0.5,

			-0.5, -0.5, -0.5,
			0.5, -0.5, -0.5,
			-0.5, 0.5, -0.5,
			0.5, 0.5, -0.5,
		]

		let indices = [
			0, 1,
			1, 2,
			2, 0,

			2, 3,
			3, 1,

			0, 5,
			5, 4,
			4, 0,
			1, 5,

			6, 4,
			6, 5,
			5, 7,
			6, 7,

			7, 3,
			7, 1
		]

		this.vertBuffer = new Buffer(vertices, BufferLayout.defaultVertexLayout(e), e)
		this.indexBuffer = new Buffer(indices, BufferLayout.defaultIndexLayout(e), e)*/
	}

	transform: Transform = null
	isStatic: boolean = false
	force: TSM.vec2 = new TSM.vec2([0, 0])
	velocity: TSM.vec2 = new TSM.vec2([0, 0])
	mass: number = 1

	public constructor(){
		this.transform = Transform.identityTransform
		this.isStatic = false
	}

	collides2D(other: CollisionBox | CollisionSphere) : boolean{
		if(other instanceof CollisionBox)
			return other.collides2D(this);
		else{
			let ln = this.transform.scale.x + other.transform.scale.x;
			let myCetner = new TSM.vec2([this.transform.position.x, this.transform.position.z])
			let otherCenter = new TSM.vec2([other.transform.position.x, other.transform.position.z])
			return TSM.vec2.distance(myCetner, otherCenter) < ln;
		}
	}

	/*Rect formula:
		x:	m
		y:	q
		z:	0: y = mx + q
			1: x = m
	*/

	private static checkRaycast(p0: TSM.vec2, p1: TSM.vec2, q0: TSM.vec2, q1: TSM.vec2){
		//TODO: Implement this
	}

	raycastCollides2D(position: TSM.vec2, direction: TSM.vec2): TSM.vec2 | false{
		//TODO: Implement this
		return false;
	}

}