import { TSM } from "../../tsm"

export enum LineType2D{
	NORMAL, X_MAJOR
}

export class Line2D{
	private type: LineType2D
	private _m: number
	private _q: number

	constructor(p0: TSM.vec2, p1: TSM.vec2){
		if(p0.x == p1.x){
			this.type = LineType2D.X_MAJOR
			this._m = p0.x
			this._q = 0
		}else{
			this.type = LineType2D.NORMAL
			this._m = (p0.y - p1.y) / (p0.x - p1.x)
			this._q = (this._m * p0.x) + p0.y
		}
	}

	get Type() : LineType2D{
		return this.type
	}

	get m(): number{
		return this._m
	}

	get q(): number{
		return this._q
	}

	collide(other: Line2D) : TSM.vec2 | boolean {
		if(this.type == LineType2D.X_MAJOR){
			if(other.Type == LineType2D.X_MAJOR){
				if(this._m != other.m)
					return false
				else
					return true
			}else{
				return other.collide(this)
			}
		}
		
		if(other.Type == LineType2D.X_MAJOR){
			let y = (this._m * other.m) + this._q
			return new TSM.vec2([other.m, y])
		}

		if(this._m == other._m){
			if(this._q != other._q){
				return false
			}else{
				return true
			}
		}

		let myX = (other._q - this._q) / (this._m - other._m)
		let myY = (this._m * myX) + this._q
		return new TSM.vec2([myX, myY])
	}
}

export class Segment2D{
	private p0: TSM.vec2
	private p1: TSM.vec2
	private line: Line2D

	constructor(p0: TSM.vec2, p1: TSM.vec2){
		this.p0 = p0
		this.p1 = p1
		this.line = new Line2D(p0, p1)
	}

	get P0() : TSM.vec2{
		return this.p0
	}

	get P1() : TSM.vec2{
		return this.p1
	}

	get Line(): Line2D{
		return this.line
	}

	private isPointInSegment(p: TSM.vec2) : boolean{
		let maxX = Math.max(this.p0.x, this.p1.x)
		let minX = Math.min(this.p0.x, this.p1.x)
		let maxY = Math.max(this.p0.y, this.p1.y)
		let minY = Math.min(this.p0.y, this.p1.y)

		return (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY)
	}

	segmentCollides(s: Segment2D) : TSM.vec2 | false{
		let res = s.line.collide(this.line)
		if(res == false)
			return false
		else if(res == true){
			if(this.isPointInSegment(s.p0))
				return s.p0.copy()
			if(this.isPointInSegment(s.p1))
				return s.p1.copy()
			return false
		}else if(res instanceof TSM.vec2){
			if(this.isPointInSegment(res))
				return res
			else
				return false
		}
	}

	lineCollides(l: Line2D) : TSM.vec2 | false{
		let res = l.collide(this.line)
		if(res == false)
			return false
		else if(res == true)
			return this.p0.copy()
		else if(res instanceof TSM.vec2){
			if(this.isPointInSegment(res))
				return res
			return false
		}
	}
}