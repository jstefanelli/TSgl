export class Map<key, value>{
	private keys: Array<key> = new Array<key>()
	private _values: Array<value> = new Array<value>()

	constructor(){

	}

	get(index: key) : value{
		let i : number = this.keys.indexOf(index)
		if(i == -1)
			return undefined
		return this._values[i]
	}

	set(index: key, val: value){
		let i : number = this.keys.indexOf(index)
		if(i == -1){
			this.keys.push(index)
			this._values.push(val)
		}else{
			this._values[i] = val
		}
	}

	amount() : number{
		return this.keys.length
	}

	clear(){
		this.keys = new Array<key>()
		this._values = new Array<value>()
	}

	delete(index: key) : value{
		let i : number = this.keys.indexOf(index)
		if(i == -1)
			return undefined
		let v = this._values[i]
		this.keys.splice(i, 1)
		this._values.splice(i, 1)
	}

	has(index: key) : boolean{
		return this.keys.indexOf(index) != -1
	}

	get values(): Array<value>{
		return this._values
	}
}