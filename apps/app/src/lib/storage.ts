import * as PathApi from "@tauri-apps/api/path";
import * as TauriFs from "@tauri-apps/plugin-fs";

type FsFile = {
	name: string;
	path: string;
	content: string | undefined;
	updatedAt: string | undefined;
};

type SetItemProps = {
	filename: string;
	content: string;
};

const DEFAULT_OPTS = {
	baseDir: TauriFs.BaseDirectory.Home,
};

export function createFsStorage(path: string) {
	async function getPathExists() {
		return await TauriFs.exists(path, DEFAULT_OPTS);
	}
	async function getFileExists(filename: string) {
		return await TauriFs.exists(
			await PathApi.join(path, filename),
			DEFAULT_OPTS,
		);
	}
	async function ensurePath() {
		const pathExists = await getPathExists();
		if (pathExists) return;
		return TauriFs.mkdir(path, { ...DEFAULT_OPTS, recursive: true });
	}
	return {
		length: 0,
		async clear() {
			await TauriFs.remove(path, { ...DEFAULT_OPTS, recursive: true });
			await ensurePath();
		},
		async listItems(): Promise<FsFile[]> {
			await ensurePath();
			const files = (await TauriFs.readDir(path, DEFAULT_OPTS)).filter((file) =>
				file.name.includes(".md"),
			);
			return await Promise.all(
				files.map(async (file) => {
					const fullPath = await PathApi.join(path, file.name);
					const meta = await TauriFs.stat(fullPath, DEFAULT_OPTS);
					return {
						name: file.name,
						path: fullPath,
						content: undefined,
						updatedAt: meta.mtime?.toISOString(),
					};
				}),
			);
		},
		async getItem(filename: string): Promise<FsFile | null> {
			const fullPath = await PathApi.join(path, filename);
			const fileExists = await getFileExists(filename);
			if (!fileExists) return null;
			const content = await TauriFs.readTextFile(fullPath, DEFAULT_OPTS);
			const meta = await TauriFs.stat(fullPath, DEFAULT_OPTS);
			return {
				name: filename,
				path: fullPath,
				updatedAt: meta.mtime?.toISOString(),
				content,
			};
		},
		async removeItem(filename: string): Promise<void> {
			const fileExists = await getFileExists(filename);
			if (!fileExists) return;
			return TauriFs.remove(await PathApi.join(path, filename), DEFAULT_OPTS);
		},
		async removeAll(): Promise<void> {
			await TauriFs.remove(await PathApi.join(path), {
				...DEFAULT_OPTS,
				recursive: true,
			});
			await ensurePath();
		},
		async setItem({ filename, content }: SetItemProps): Promise<void> {
			const newPath = await PathApi.join(path, filename);
			await ensurePath();
			return TauriFs.writeTextFile(newPath, content, DEFAULT_OPTS);
		},
		async renameItem({
			filename,
			nextFilename,
		}: { filename: string; nextFilename: string }) {
			const originalPath = await PathApi.join(path, filename);
			const newPath = await PathApi.join(path, nextFilename);
			await ensurePath();
			return TauriFs.rename(originalPath, newPath, {
				oldPathBaseDir: DEFAULT_OPTS.baseDir,
				newPathBaseDir: DEFAULT_OPTS.baseDir,
			});
		},
		async exists(filename: string) {
			return getFileExists(filename);
		},
	};
}
