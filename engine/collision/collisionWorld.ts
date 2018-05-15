import { TSM } from "../tsm"
import { Map } from "../map"
import { CollisionBox } from "./shapes/box"
import { Transform } from "../wrappers/world";

export interface Collider{
	transform: Transform 
	isStatic: boolean 
	force: TSM.vec3 
	velocity: TSM.vec3
	mass: number
}

export enum CollisionMode{
	COLLISION_2D, COLLISION_3D
}

export class CollisionWorld{

	private boxes: Map<string, Collider> = null
	private mode: CollisionMode = CollisionMode.COLLISION_2D

	addCollider(key: string, box: Collider){
		this.boxes.set(key, box)
	}

	removeCollider(key: string){
		if(this.boxes.has(key))
			this.boxes.delete(key)
	}

	getCollider(key: string) : Collider{
		return this.boxes.get(key)
	}

	public constructor(){
		this.boxes = new Map<string, Collider>()
	}

	public step(time: number){
		if(this.mode = CollisionMode.COLLISION_2D){
			this.boxes.values.forEach((b: Collider) => {
				if(b.isStatic)
					return
				//y = t + 1
				let f_k = b.force.copy().divide(new TSM.vec3([b.mass, b.mass, b.mass])).multiply(new TSM.vec3([time, time, time]))
				let v_y = f_k.add(b.velocity)
				b.velocity = v_y.copy()
				v_y.multiply(new TSM.vec3([time, time, time]))
				let oldPosition = b.transform.position.copy()
				b.transform.position.add(new TSM.vec3([v_y.x, 0, v_y.y]))
			})
		}
	}
}