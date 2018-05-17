import { TSM } from "../../tsm"
import { Transform } from "../../wrappers/world"
import { CollisionWorld, Collider } from "../collisionWorld";
import { CollisionBox } from "./box"
import { GLStatus, TSglContext, Buffer, BufferLayout } from "../../wrappers/gl";
import { Light } from "../../wrappers/light";
import { Line2D, LineType2D } from "../support/math";
import { Material } from "../../wrappers/material";
import { IResourceUser, IResource, ResourceType, MeshProtocol } from "../../resourceManager";
import { Mesh, MeshPart, MeshPartInstance, MeshInstance } from "../../wrappers/mesh";

export class CollisionSphere implements Collider{
	public static staticLoaded: boolean = false
	public static vertBuffer: Buffer = null
	public static normalBuffer: Buffer = null
	public static texCoordBuffer : Buffer = null
	//public static indexBuffer: Buffer = null
	private static meshPartArray: Array<MeshPart> = null

	public static staticLoad(e: TSglContext){
		
		if(this.staticLoaded)
			return

		let vertices = [
			0, 0, -1,
			Math.cos(Math.PI / 3), 0, -Math.sin(Math.PI / 3),
			
			Math.cos(Math.PI / 3), 0, -Math.sin(Math.PI / 3),
			Math.cos(Math.PI / 6), 0, -Math.sin(Math.PI / 6),
			
			Math.cos(Math.PI / 6), 0, -Math.sin(Math.PI / 6),
			1, 0, 0,

			1, 0, 0,
			Math.cos(Math.PI / 6), 0, Math.sin(Math.PI / 6),

			Math.cos(Math.PI / 6), 0, Math.sin(Math.PI / 6),
			Math.cos(Math.PI / 3), 0, Math.sin(Math.PI / 3),

			Math.cos(Math.PI / 3), 0, Math.sin(Math.PI / 3),
			0, 0, 1,

			0, 0, 1,
			-Math.cos(Math.PI / 3), 0, Math.sin(Math.PI / 3),

			-Math.cos(Math.PI / 3), 0, Math.sin(Math.PI / 3),
			-Math.cos(Math.PI / 6), 0, Math.sin(Math.PI / 6),

			-Math.cos(Math.PI / 6), 0, Math.sin(Math.PI / 6),
			-1, 0, 0,

			-1, 0, 0,
			-Math.cos(Math.PI / 6), 0, -Math.sin(Math.PI / 6),

			-Math.cos(Math.PI / 6), 0, -Math.sin(Math.PI / 6),
			-Math.cos(Math.PI / 3), 0, -Math.sin(Math.PI / 3),

			-Math.cos(Math.PI / 3), 0, -Math.sin(Math.PI / 3),
			0, 0, -1,
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

			0, 1, 0,
			0, 1, 0
		]

		let uvs = [
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

			0, 0,
			0, 0,
		]

		/* let indices = [
			0, 12, 1, 
			1, 12, 2,
			2, 12, 3, 
			3, 12, 4, 
			4, 12, 5, 
			5, 12, 6, 
			6, 12, 7, 
			7, 12, 8, 
			8, 12, 9, 
			9, 12, 10, 
			10, 12, 11, 
			11, 12, 0
		]*/

		if((vertices.length / 3 != normals.length / 3) || (vertices.length / 3 != uvs.length / 2))
			throw new Error("Something went wrong in CollisionSphere.staticLoad")

		this.vertBuffer = new Buffer(vertices, BufferLayout.defaultVertexLayout(e), e)
		this.normalBuffer = new Buffer(normals, BufferLayout.defaultNormalLayout(e), e)
		this.texCoordBuffer = new Buffer(uvs, BufferLayout.defaultTexCoordLayout(e), e)
		e.manager.registerMaterial("circleDebugMaterial", new Material([], [], [new TSM.vec4([0, 1, 0, 1])], "basic", e))
		this.meshPartArray = [ new MeshPart(24, 0) ]
		this.staticLoaded = true
		/*this.indexBuffer = new Buffer(indices, BufferLayout.defaultIndexLayout(e), e)*/
	}

	transform: Transform = null
	isStatic: boolean = false
	force: TSM.vec3 = new TSM.vec3([0, 0])
	velocity: TSM.vec3 = new TSM.vec3([0, 0])
	mass: number = 1

	private meshInstance: MeshInstance = null
	private _loaded = false
	private e: TSglContext

	public constructor(e: TSglContext){
		this.transform = Transform.identityTransform
		this.isStatic = false
		this.e = e
	}

	public load(){
		if(this._loaded)
			return
		if(!CollisionSphere.staticLoaded)
			CollisionSphere.staticLoad(this.e)
		this.meshInstance = new MeshInstance(this.e, "circleDebugMesh", MeshProtocol.RAW, ["circleDebugMaterial"], [CollisionSphere.vertBuffer, CollisionSphere.normalBuffer, CollisionSphere.texCoordBuffer, CollisionSphere.meshPartArray, this.e.gl.LINES])
		this._loaded = true
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