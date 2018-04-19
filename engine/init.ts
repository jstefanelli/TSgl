import { Engine } from "./engine"
import { Scene } from "./logic/scene";

export class Initializer{
	static init(container_id: String) : Engine {
		var container = $("#" + container_id);
		var actual_container : JQuery = container.children(".jfs-container")
		var glCanvas = actual_container.children(".engine_gl_canvas")
		var textCanvas = actual_container.children(".text_gl_canvas")
		
		let context = new Engine(glCanvas, textCanvas, actual_container);

		return context;
	}
}