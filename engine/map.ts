export class Map<key, value>{
	private keys: Array<key> = new Array<key>()
	private values: Array<value> = new Array<value>()

	constructor(){

	}

	get(index: key) : value{
		let i : number = this.keys.indexOf(index)
		if(i == -1)
			return undefined
		return this.values[i]
	}

	set(index: key, val: value){
		let i : number = this.keys.indexOf(index)
		if(i == -1){
			this.keys.push(index)
			this.values.push(val)
		}else{
			this.values[i] = val
		}
	}

	clear(){
		this.keys = new Array<key>()
		this.values = new Array<value>()
	}

	delete(index: key) : value{
		let i : number = this.keys.indexOf(index)
		if(i == -1)
			return undefined
		let v = this.values[i]
		this.keys.splice(i, 1)
		this.values.splice(i, 1)
	}

	has(index: key) : boolean{
		return this.keys.indexOf(index) != -1
	}
}