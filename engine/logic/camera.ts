import { TSM } from "../tsm"

export class Camera{
	public position: TSM.vec3 = new TSM.vec3([0, 0, 1])
	public orientation: TSM.vec3 = new TSM.vec3([0, 0, 0])
	public fov: number = 90
	public nearPlane: number = 0.01
	public farPlane: number = 100

	move(dir: TSM.vec3){
		this.position.add(dir)
	}

	rotate(dir: TSM.vec3){
		this.orientation.add(dir)
	}

	get rotationMatrix() : TSM.mat4{
		let m = new TSM.mat4([])
		m.setIdentity()
		m.rotate(this.orientation.y, new TSM.vec3([0, 1, 0]))
		m.rotate(this.orientation.x, new TSM.vec3([1, 0, 0]))
		m.rotate(this.orientation.z, new TSM.vec3([0, 0, 1]))
		return m
	}
}