declare module "file-icon" {
	/**
	 * Options for file icon operations
	 */
	export interface FileIconOptions {
		size?: number;
		scale?: number;
		[key: string]: unknown;
	}

	/**
	 * Converts a file or application icon to a buffer
	 * @param path Path to the file or application
	 * @param options Optional configuration options
	 * @returns Promise that resolves to a Buffer containing the icon data
	 */
	export function fileIconToBuffer(
		path: string,
		options?: FileIconOptions,
	): Promise<Buffer>;

	/**
	 * Converts a file or application icon to a file
	 * @param path Path to the file or application
	 * @param destination Path where the icon file should be saved
	 * @param options Optional configuration options
	 * @returns Promise that resolves when the icon has been saved
	 */
	export function fileIconToFile(
		path: string,
		destination: string,
		options?: FileIconOptions,
	): Promise<void>;
}
