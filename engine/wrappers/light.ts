import { TSM } from "../tsm"

export enum LightType{
	DIR, POINT, SPOT
}

export interface Light{
	readonly type: LightType
	readonly factors: TSM.vec3
	readonly color: TSM.vec3
}

export class DirectionalLight implements Light{
	protected _direction: TSM.vec3 = new TSM.vec3([0, -1, 0])
	protected _color: TSM.vec3 = new TSM.vec3([1, 1, 1])
	protected _factors: TSM.vec3 = new TSM.vec3([1, 1, 1])

	set direction(dir: TSM.vec3){
		this._direction = dir.copy().normalize()
	}

	get direction(): TSM.vec3{
		return this._direction
	}

	get type(): LightType{
		return LightType.DIR
	}

	set color(col: TSM.vec3){
		this._color = col;
	}

	get color(): TSM.vec3{
		return this._color;
	}

	set factors(facs: TSM.vec3){
		this._factors = facs
	}

	get factors(): TSM.vec3{
		return this._factors
	}
}

export class PointLight implements Light{
	protected _position: TSM.vec3 = new TSM.vec3([0, -1, 0])
	protected _color: TSM.vec3 = new TSM.vec3([1, 1, 1])
	protected _factors: TSM.vec3 = new TSM.vec3([0, 1, 0])
	protected _range: number = 10
	protected _funcFactors: TSM.vec3 = new TSM.vec3([1, 0.1, 0.01])

	set position(dir: TSM.vec3){
		this._position = dir
	}

	get position(): TSM.vec3{
		return this._position
	}

	get type(): LightType{
		return LightType.POINT
	}

	set color(col: TSM.vec3){
		this._color = col;
	}

	get color(): TSM.vec3{
		return this._color;
	}

	set factors(facs: TSM.vec3){
		this._factors = facs
	}

	get factors(): TSM.vec3{
		return this._factors
	}

	set funcFactors(facs: TSM.vec3){
		this._funcFactors = facs
	}

	get funcFactors(): TSM.vec3{
		return this._funcFactors
	}
}