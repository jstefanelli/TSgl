import { TSM } from "../../tsm"
import { Transform } from "../../wrappers/world"
import { CollisionWorld, Collider } from "../collisionWorld";
import { CollisionBox } from "./box"
import { GLStatus, TSglContext, Buffer, BufferLayout } from "../../wrappers/gl";
import { Light } from "../../wrappers/light";
import { Line2D, LineType2D } from "../support/math";

export class CollisionSphere implements Collider{
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
	force: TSM.vec3 = new TSM.vec3([0, 0])
	velocity: TSM.vec3 = new TSM.vec3([0, 0])
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

	raycastCollides2D(position: TSM.vec2, direction: TSM.vec2): TSM.vec2 | false{
		let p2 = direction.copy().add(position)

		let rayLine = new Line2D(position, p2)
		
		let angle = (rayLine.Type == LineType2D.X_MAJOR) ? Math.PI / 2 : Math.atan(rayLine.m)
		let sinA = Math.sin(angle)
		let cosA = Math.cos(angle)
		let rotationMatrix = new TSM.mat2([cosA, -sinA, sinA, cosA])
		let center = new TSM.vec2([this.transform.position.x, this.transform.position.z]).multiplyMat2(rotationMatrix)
		
		let distance = TSM.vec2.distance(center, new TSM.vec2([center.x, 0]))
		
		p2.multiplyMat2(rotationMatrix)
		let p1 = position.copy().multiplyMat2(rotationMatrix)
		p2.subtract(p1)
		center.subtract(p1)
		if(center.x * p2.x < 0)
			return false
		
		if(distance > this.transform.scale.x)
			return false
		
		//TODO: Get actual collision point
		return new TSM.vec2([this.transform.position.x, this.transform.position.z]);
	}

}