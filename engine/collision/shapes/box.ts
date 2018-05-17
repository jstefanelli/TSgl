import { TSM } from "../../tsm"
import { Transform } from "../../wrappers/world"
import { CollisionWorld, Collider } from "../collisionWorld";
import { CollisionSphere} from "./sphere"
import { GLStatus, TSglContext, Buffer, BufferLayout } from "../../wrappers/gl";
import { Light } from "../../wrappers/light";
import { Line2D, Segment2D, LineType2D } from "../support/math"
import { Material } from "../../wrappers/material";
import { MeshPart, MeshInstance } from "../../wrappers/mesh";
import { MeshProtocol } from "../../resourceManager";

export class CollisionBox implements Collider{
	public static staticLoaded: boolean = false
	public static vertBuffer: Buffer = null
	public static normalBuffer: Buffer = null
	public static texCoordBuffer: Buffer = null
	private static drawMode: number = null
	private static meshPartArray: MeshPart[] = null
	

	public static staticLoad(e: TSglContext){
		if(this.staticLoaded)
			return

		console.log("[CollisionBox] StaticLoading...")
		
		let vertices = [
			-0.5, 0, 0.5,
			0.5, 0, 0.5,

			0.5, 0, 0.5,
			-0.5, 0, -0.5,

			-0.5, 0, -0.5,
			-0.5, 0, 0.5,

			-0.5, 0, -0.5,
			0.5, 0, -0.5,

			0.5, 0, -0.5,
			0.5, 0, 0.5
		]

		let normals = [
			0, 1, 0,
			0, 1, 0,

			0, 1, 0,
			0, 1, 0,
			
			0, 1, 0,
			0, 1, 0,
			
			0, 1, 0,
			0, 1, 0,
			
			0, 1, 0,
			0, 1, 0,
		]

		let texCoords = [
			0, 0,
			0, 0,
			
			0, 0,
			0, 0,
			
			0, 0,
			0, 0,
			
			0, 0,
			0, 0,
			
			0, 0,
			0, 0,
		]

		this.vertBuffer = new Buffer(vertices, BufferLayout.defaultVertexLayout(e), e)
		this.normalBuffer = new Buffer(normals, BufferLayout.defaultNormalLayout(e), e)
		this.texCoordBuffer = new Buffer(texCoords, BufferLayout.defaultTexCoordLayout(e), e)
		e.manager.registerMaterial("squareDebugMaterial", new Material([], [], [new TSM.vec4([1, 0, 0, 1])], "basic", e))
		this.meshPartArray =[ new MeshPart(10, 0) ]
		this.drawMode = e.gl.LINES
		this.staticLoaded = true
	}

	transform: Transform = null
	isStatic: boolean = false
	force: TSM.vec3 = new TSM.vec3([0, 0])
	velocity: TSM.vec3 = new TSM.vec3([0, 0])
	mass: number = 1
	tags: string[] = new Array<string>()

	private e: TSglContext
	private meshInstance: MeshInstance
	private _loaded: boolean = false

	public constructor(e: TSglContext){
		this.transform = Transform.identityTransform
		this.isStatic = false
		this.e = e
	}

	get loaded(): boolean{
		return this._loaded
	}

	public load(){
		if(this._loaded)
			return
		if(!CollisionBox.staticLoaded)
			CollisionBox.staticLoad(this.e)
		console.log("[CollisionBox] Loading...")
		this.meshInstance = new MeshInstance(this.e, "squareDebugMesh", MeshProtocol.RAW, ["squareDebugMaterial"], [CollisionBox.vertBuffer, CollisionBox.normalBuffer, CollisionBox.texCoordBuffer, CollisionBox.meshPartArray, CollisionBox.drawMode])
		this.meshInstance.loadAsync(null)
		this._loaded = true
		console.log("[CollisionBox] Loaded")
	}

	public draw(status: GLStatus){
		if(!this._loaded)
			this.load()
		status.applyTransformToModel(this.transform)
		this.meshInstance.draw(status, [])
		status.revertLastModelTransform()
	}

	public unload(){
		if(!this._loaded)
			return
		this.meshInstance.unload()
		this.meshInstance = null
		this._loaded = false
	}

	private collides2DBox(other: CollisionBox) : boolean{
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
			new TSM.mat2([directionZP.x, -directionZP.y, directionZP.y, directionZP.x]), 
			new TSM.mat2([directionZM.x, -directionZM.y, directionZM.y, directionZM.x]),
			new TSM.mat2([directionXM.x, -directionXM.y, directionXM.y, directionXM.x]),
			new TSM.mat2([directionXP.x, -directionXP.y, directionXP.y, directionXP.x])
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

	private distanceFromSegment(v: TSM.vec2, w: TSM.vec2, p: TSM.vec2) : number {
		let len2: number = TSM.vec2.squaredDistance(v, w)

		if(len2 == 0.0)
			return TSM.vec2.distance(v, p)

		let w_v = w.copy().subtract(v)

		let t = Math.max(0, Math.min(1, TSM.vec2.dot(p.copy().subtract(w), w_v) / len2))
		let projection: TSM.vec2 = v.copy().add(w_v.copy().multiply(new TSM.vec2([t, t])))
		return TSM.vec2.distance(projection, p)
	}

	private collides2DSphere(other: CollisionSphere) : boolean{
		let myRotationMatrix = TSM.mat2.identity
		myRotationMatrix.rotate(this.transform.orientation.y)

		let myVertexXMZP = new TSM.vec2([this.transform.position.x - (0.5 * this.transform.scale.x), this.transform.position.z + (0.5 * this.transform.scale.z)]).multiplyMat2(myRotationMatrix)
		let	myVertexXPZP = new TSM.vec2([this.transform.position.x + (0.5 * this.transform.scale.x), this.transform.position.z + (0.5 * this.transform.scale.z)]).multiplyMat2(myRotationMatrix)
		let myVertexXMZM = new TSM.vec2([this.transform.position.x - (0.5 * this.transform.scale.x), this.transform.position.z - (0.5 * this.transform.scale.z)]).multiplyMat2(myRotationMatrix)
		let myVertexXPZM = new TSM.vec2([this.transform.position.x + (0.5 * this.transform.scale.x), this.transform.position.z - (0.5 * this.transform.scale.z)]).multiplyMat2(myRotationMatrix)

		let vertices: TSM.vec2[] = [
			myVertexXMZM,
			myVertexXMZP,
			myVertexXPZP,
			myVertexXPZM
		]

		var min = Number.MAX_VALUE;

		let other_center = new TSM.vec2([other.transform.position.x, other.transform.position.z])

		for(var i = 0; i < 4; i++){
			let i2 = (i == 3) ? 0 : i + 1
			let dist = this.distanceFromSegment(vertices[i], vertices[i2], other_center)
			if(dist < min)
				min = dist
		}

		return min <= other.transform.scale.x
	}

	collides2D(other: CollisionBox | CollisionSphere) : boolean{
		if(other instanceof CollisionBox)
			return this.collides2DBox(other)
		else
			return this.collides2DSphere(other)
	}

	raycastCollides2D(position: TSM.vec2, direction: TSM.vec2): TSM.vec3 | false{
		let myRotationMatrix = new TSM.mat2()
		myRotationMatrix.setIdentity()
		myRotationMatrix.rotate(this.transform.orientation.y,)

		let myVertexXMZP = new TSM.vec2([this.transform.position.x - (0.5 * this.transform.scale.x), this.transform.position.z + (0.5 * this.transform.scale.z)]).multiplyMat2(myRotationMatrix)
		let	myVertexXPZP = new TSM.vec2([this.transform.position.x + (0.5 * this.transform.scale.x), this.transform.position.z + (0.5 * this.transform.scale.z)]).multiplyMat2(myRotationMatrix)
		let myVertexXMZM = new TSM.vec2([this.transform.position.x - (0.5 * this.transform.scale.x), this.transform.position.z - (0.5 * this.transform.scale.z)]).multiplyMat2(myRotationMatrix)
		let myVertexXPZM = new TSM.vec2([this.transform.position.x + (0.5 * this.transform.scale.x), this.transform.position.z - (0.5 * this.transform.scale.z)]).multiplyMat2(myRotationMatrix)

		let segments = [ 
			new Segment2D(myVertexXMZM, myVertexXMZP),
			new Segment2D(myVertexXMZP, myVertexXPZP),
			new Segment2D(myVertexXPZP, myVertexXPZM),
			new Segment2D(myVertexXPZM, myVertexXMZM)
		]
		
		let p2 = position.copy().add(direction)
		let line = new Line2D(position, p2)

		var distance = Number.MAX_VALUE
		var point: any = false
		segments.forEach((seg : Segment2D) => {
			let c = seg.lineCollides(line)
			if(c == false)
				return
			if(c instanceof TSM.vec2){
				let d = TSM.vec2.distance(position, c)
				if(d < distance){
					distance = d
					point = c
				}
			}
		})
		if(point == false)
			return false
		if(point instanceof TSM.vec2){
			
			let angle = (line.Type == LineType2D.X_MAJOR) ? Math.PI / 2 : Math.atan(line.m)
			let cosA = Math.cos(angle)
			let sinA = Math.sin(angle)

			let negRotationMatrix = new TSM.mat2([cosA, -sinA, sinA, cosA])
			
			p2.multiplyMat2(negRotationMatrix)
			let p1 = position.copy().multiplyMat2(negRotationMatrix)
			let p3 = point.copy().multiplyMat2(negRotationMatrix)
			
			p2.subtract(p1)
			p3.subtract(p1)
			
			if((p3.x * p2.x) < 0)
				return false
			return new TSM.vec3([point.x, 0, point.y])
		}
	}

	static runTest(){
		let b1: CollisionBox = new CollisionBox(null)
		b1.transform.position = new TSM.vec3([0, 0, 0])
		b1.transform.orientation = new TSM.vec3([0, 0, 0])
		b1.transform.scale = new TSM.vec3([1, 1, 1])

		let b2: CollisionBox = new CollisionBox(null)
		b2.transform.position = new TSM.vec3([1, 0, 0])
		b2.transform.orientation = new TSM.vec3([0, 0, 0])
		b2.transform.scale = new TSM.vec3([1, 1, 1])

		console.log("Collision test result: ")
		console.log(b1.collides2D(b2))

		let position = new TSM.vec2([0, -3])
		let direction = new TSM.vec2([0, -1])

		let raycast = b1.raycastCollides2D(position, direction)
		console.log("Raycast test result: ")
		console.log(raycast)
	}
}