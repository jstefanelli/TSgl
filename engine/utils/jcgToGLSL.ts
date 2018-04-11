import { Material } from "../wrappers/material"
import { Shader, Buffer, IDrawable, GLStatus, TSglContext } from "../wrappers/gl"
import { TSM } from "../tsm"

export class jcgShader extends Shader {

	public static GLSL_ES_MODE: boolean = true;

	//#region REGEXES

	private static glslDataTypes: string = "(vec4|vec3|vec2|float|ivec4|ivec3|ivec2|int|mat4|mat3|mat2|sampler2D|sampler3D)"
	private static uniformMnemonics: string = "(MVP|MV|V|M|P|NRM|COL[0-9]+|TEX[0-9]+|UV[0-9]+|TEXE[0-9]+|LIGHT[0-9]+|SHIN[0-9]+|MAT[0-9]+)"
	private static attributeMnemonics: string = "(POS|UV|NRM|TAN|BTAN|COL)"
	public static uniformDefinition: RegExp = new RegExp("^\s*uniform\s+" + jcgShader.glslDataTypes + "\s+([a-zA-Z_][a-ZA-Z0-9_]*)\s+:\s+" + jcgShader.uniformMnemonics + "\s*;\s*")
	public static attributeDefinition: RegExp = new RegExp("^\s*attribute\s+" + jcgShader.glslDataTypes + "\s+([a-zA-Z_][a-ZA-Z0-9_]*)\s+:\s+" + jcgShader.attributeMnemonics + "\s*;\s*")
	public static vsMainDefinition: RegExp = new RegExp("^\s*void\s+vs_main\s*()\s*")
	public static fsMainDefinition: RegExp = new RegExp("^\s*void\s+fs_main\s*()\s*")

	//#endregion

	private cgSource: string;
	private glVsSource: string;
	private glFsSource: string;

	constructor(cgSource: string, engine: TSglContext){
		super(engine);

		this.cgSource = cgSource;
	}

	private compile(){
			
	}

	draw(status: GLStatus, section: IDrawable, lights: TSM.vec4[]): void {
		
	}

	load(): void {
		
	}

	unload(): void {
		
	}
}