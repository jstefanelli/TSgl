import { TSM } from "../tsm"
import { Map } from "../map"
import { CollisionBox } from "./shapes/box"
import { Transform } from "../wrappers/world";
import { TSglContext, GLStatus } from "../wrappers/gl";

export interface Collider{
	transform: Transform 
	isStatic: boolean 
	force: TSM.vec3 
	velocity: TSM.vec3
	mass: number

	draw(status: GLStatus) : void
}

export enum CollisionMode{
	COLLISION_2D, COLLISION_3D
}

export class CollisionWorld{

	private colliders: Map<string, Collider> = null
	private mode: CollisionMode = CollisionMode.COLLISION_2D

	addCollider(key: string, box: Collider){
		this.colliders.set(key, box)
	}

	removeCollider(key: string){
		if(this.colliders.has(key))
			this.colliders.delete(key)
	}

	getCollider(key: string) : Collider{
		return this.colliders.get(key)
	}

	public constructor(){
		this.colliders = new Map<string, Collider>()
	}

	public step(time: number){
		if(this.mode = CollisionMode.COLLISION_2D){
			this.colliders.values.forEach((b: Collider) => {
				if(b.isStatic)
					return
				//y = t + 1
				let f_k = b.force.copy().divide(new TSM.vec3([b.mass, b.mass, b.mass])).multiply(new TSM.vec3([time, time, time]))
				let v_y = f_k.add(b.velocity)
				b.velocity = v_y.copy()
				v_y.multiply(new TSM.vec3([time, time, time]))
				let oldPosition = b.transform.position.copy()
				b.transform.position.add(new TSM.vec3([v_y.x, 0, v_y.z]))
				b.force = new TSM.vec3([0, 0, 0])
			})
		}
	}

	public drawDebugWorld(status: GLStatus, e: TSglContext){
		e.gl.lineWidth(3)
		this.colliders.values.forEach((b: Collider) => {
			b.draw(status)
		})
	}
}