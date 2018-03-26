import { TSM } from "../tsm"

export class Transform{
	position: TSM.vec3
	orientation: TSM.vec3
	scale: TSM.vec3

	constructor(position: TSM.vec3, orientation: TSM.vec3, scale: TSM.vec3){
		this.position = position
		this.orientation = orientation
		this.scale = scale
	}

	static get identityTransform(): Transform{
		return new Transform(
			new TSM.vec3([0, 0, 0]),
			new TSM.vec3([0, 0, 0]),
			new TSM.vec3([1, 1, 1])
		)
	}
}