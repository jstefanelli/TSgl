import { TSM } from "../../tsm"
import { Transform } from "../../wrappers/world"
import { CollisionWorld } from "../collisionWorld";
import { GLStatus, TSglContext, Buffer, BufferLayout } from "../../wrappers/gl";
import { Light } from "../../wrappers/light";

export class CollisionBox{
	public static staticLoaded: boolean = false
	public static vertBuffer: Buffer = null
	public static indexBuffer: Buffer = null

	public static staticLoad(e: TSglContext){
		if(this.staticLoaded)
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
		this.indexBuffer = new Buffer(indices, BufferLayout.defaultIndexLayout(e), e)
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

	collides2D(other: CollisionBox) : boolean{
		let myRotationMatrix = TSM.mat2.identity
		myRotationMatrix.rotate(this.transform.orientation.y)

		let oRotationMatrix = TSM.mat2.identity
		oRotationMatrix.rotate(other.transform.orientation.y)

		let myVertexXMZP = new TSM.vec2([this.transform.position.x - (0.5 * this.transform.scale.x), this.transform.position.z + (0.5 * this.transform.scale.z)]).multiplyMat2(myRotationMatrix)
		let	myVertexXPZP = new TSM.vec2([this.transform.position.x + (0.5 * this.transform.scale.x), this.transform.position.z + (0.5 * this.transform.scale.z)]).multiplyMat2(myRotationMatrix)
		let myVertexXMZM = new TSM.vec2([this.transform.position.x - (0.5 * this.transform.scale.x), this.transform.position.z - (0.5 * this.transform.scale.z)]).multiplyMat2(myRotationMatrix)
		let myVertexXPZM = new TSM.vec2([this.transform.position.x + (0.5 * this.transform.scale.x), this.transform.position.z - (0.5 * this.transform.scale.z)]).multiplyMat2(myRotationMatrix)

		let oVertexXMZP = new TSM.vec2([other.transform.position.x - (0.5 * other.transform.scale.x), other.transform.position.z + (0.5 * other.transform.scale.z)]).multiplyMat2(oRotationMatrix)
		let	oVertexXPZP = new TSM.vec2([other.transform.position.x + (0.5 * other.transform.scale.x), other.transform.position.z + (0.5 * other.transform.scale.z)]).multiplyMat2(oRotationMatrix)
		let oVertexXMZM = new TSM.vec2([other.transform.position.x - (0.5 * other.transform.scale.x), other.transform.position.z - (0.5 * other.transform.scale.z)]).multiplyMat2(oRotationMatrix)
		let oVertexXPZM = new TSM.vec2([other.transform.position.x + (0.5 * other.transform.scale.x), other.transform.position.z - (0.5 * other.transform.scale.z)]).multiplyMat2(oRotationMatrix)

		let directionZP = myVertexXMZP.copy().subtract(myVertexXPZP).normalize();
		let directionZM = oVertexXMZM.copy().subtract(oVertexXPZM).normalize();
		let directionXM = myVertexXMZM.copy().subtract(myVertexXMZP).normalize();
		let directionXP = oVertexXPZM.copy().subtract(oVertexXPZP).normalize();
		let rotMats : TSM.mat2[] = [
			new TSM.mat2([directionZP.x, directionZP.y, -directionZP.y, directionZP.x]), 
			new TSM.mat2([directionZM.x, directionZM.y, -directionZM.y, directionZM.x]),
			new TSM.mat2([directionXM.x, directionXM.y, -directionXM.y, directionXM.x]),
			new TSM.mat2([directionXP.x, directionXP.y, -directionXP.y, directionXP.x])
		]

		for(var i = 0; i < 4; i++){
			let mat = rotMats[i];
			let p_myVertexXMZP = myVertexXMZP.copy().multiplyMat2(mat)
			let p_myVertexXPZP = myVertexXPZP.copy().multiplyMat2(mat)
			let p_myVertexXMZM = myVertexXMZM.copy().multiplyMat2(mat)
			let p_myVertexXPZM = myVertexXPZM.copy().multiplyMat2(mat)

			let my_minX = Math.min(p_myVertexXMZM.x, p_myVertexXPZP.x, p_myVertexXMZM.x, p_myVertexXPZM.x)
			let my_maxX = Math.max(p_myVertexXMZM.x, p_myVertexXPZP.x, p_myVertexXMZM.x, p_myVertexXPZM.x)

			let p_oVertexXMZP = oVertexXMZP.copy().multiplyMat2(mat)
			let p_oVertexXPZP = oVertexXPZP.copy().multiplyMat2(mat)
			let p_oVertexXMZM = oVertexXMZM.copy().multiplyMat2(mat)
			let p_oVertexXPZM = oVertexXPZM.copy().multiplyMat2(mat)

			let o_minX = Math.min(p_oVertexXMZM.x, p_oVertexXPZP.x, p_oVertexXMZM.x, p_oVertexXPZM.x)
			let o_maxX = Math.max(p_oVertexXMZM.x, p_oVertexXPZP.x, p_oVertexXMZM.x, p_oVertexXPZM.x)

			if(my_maxX < o_minX)
				return false
			if(my_minX > o_maxX)
				return false
		}

		return true
	}

	/*Rect formula:
		x:	m
		y:	q
		z:	0: y = mx + q
			1: x = m
	*/

	private static getRect2D(p0: TSM.vec2, p1: TSM.vec2) : TSM.vec3{
		if(p0.x == p1.x)
			return new TSM.vec3([p0.x, 1, 1])
		else{
			let m = (p1.y - p0.y) / (p1.x - p0.x)
			let q = ((p1.x * p0.y) - (p0.x * p1.y)) / (p1.x - p0.x)
			return new TSM.vec3([m, q, 0])
		}

	}

	private static checkRaycast(p0: TSM.vec2, p1: TSM.vec2, q0: TSM.vec2, q1: TSM.vec2){

	}

	raycastCollides2D(position: TSM.vec3, direction: TSM.vec3): TSM.vec3 | false{
		let myRotationMatrix = new TSM.mat2()
		myRotationMatrix.rotate(this.transform.orientation.y,)
		let distance = TSM.vec3.distance(position, this.transform.position)
		let end = direction.copy().multiply(new TSM.vec3([distance, distance, distance]))
		end.add(position)

		let p0 = new TSM.vec2([position.x, position.z])
		let p1 = new TSM.vec2([end.x, end.z])

		let myVertexXMZP = new TSM.vec2([this.transform.position.x - (0.5 * this.transform.scale.x), this.transform.position.z + (0.5 * this.transform.scale.z)]).multiplyMat2(myRotationMatrix)
		let	myVertexXPZP = new TSM.vec2([this.transform.position.x + (0.5 * this.transform.scale.x), this.transform.position.z + (0.5 * this.transform.scale.z)]).multiplyMat2(myRotationMatrix)
		let myVertexXMZM = new TSM.vec2([this.transform.position.x - (0.5 * this.transform.scale.x), this.transform.position.z - (0.5 * this.transform.scale.z)]).multiplyMat2(myRotationMatrix)
		let myVertexXPZM = new TSM.vec2([this.transform.position.x + (0.5 * this.transform.scale.x), this.transform.position.z - (0.5 * this.transform.scale.z)]).multiplyMat2(myRotationMatrix)

		return false
	}

	static runTest(){
		let b1: CollisionBox = new CollisionBox()
		b1.transform.position = new TSM.vec3([0, 0, 0])
		b1.transform.orientation = new TSM.vec3([0, Math.PI / 2, 0])
		b1.transform.scale = new TSM.vec3([1, 1, 1])

		let b2: CollisionBox = new CollisionBox()
		b2.transform.position = new TSM.vec3([1.5, 0, 0])
		b2.transform.orientation = new TSM.vec3([0, 0, 0])
		b2.transform.scale = new TSM.vec3([1, 1, 1])

		console.log("Collision test result: ")
		console.log(b1.collides2D(b2))
	}
}