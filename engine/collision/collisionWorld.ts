import { TSM } from "../tsm"
import { Map } from "../map"
import { CollisionBox } from "./shapes/box"

export class CollisionWorld{

	public boxes: Map<string, CollisionBox> = null

	addCollider(key: string, box: CollisionBox){
		this.boxes.set(key, box)
	}

	removeCollider(key: string){
		if(this.boxes.has(key))
			this.boxes.delete(key)
	}

	getCollider(key: string) : CollisionBox{
		return this.boxes.get(key)
	}

	public constructor(){
		this.boxes = new Map<string, CollisionBox>()
	}

	public step(time: number){
		this.boxes.values.forEach((b: CollisionBox) => {
			if(b.isStatic)
				return
			//y = t + 1
			let f_k = b.force.copy().divide(new TSM.vec2([b.mass, b.mass])).multiply(new TSM.vec2([time, time]))
			let v_y = f_k.add(b.velocity)
			b.velocity = v_y.copy()
			v_y.multiply(new TSM.vec2([time, time]))
			b.transform.position.add(new TSM.vec3([v_y.x, 0, v_y.y]))
		})
	}
}