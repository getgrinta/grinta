import path from "node:path";
import { parseArgs } from "node:util";
import { spawn } from "bun";
import clipboard from "clipboardy";

const { positionals } = parseArgs({
	args: Bun.argv,
	allowPositionals: true,
});

const filename = positionals[2];
if (!filename) {
	console.error("Error: Please provide a test file name as an argument");
	console.error("Usage: bun apps/app/scripts/e2e-runner.ts <test-file-name>");
	process.exit(1);
}

async function openDevTools() {
	const proc = spawn({
		cmd: [
			"osascript",
			"-e",
			`tell application "System Events"
          -- Send Command+Space (typically opens Spotlight)
          key code 49 using {command down}
          -- Wait a moment for Spotlight to open
          delay 0.5
          -- Send Command+Option+I
          key code 34 using {command down, option down}
        end tell`,
		],
		stdout: "pipe",
		stderr: "pipe",
	});

	const output = await new Response(proc.stdout).text();
	const error = await new Response(proc.stderr).text();

	console.log("Output:", output);
	if (error) console.error("Error:", error);

	return proc.exitCode;
}

async function pasteFromClipboard() {
	const proc = spawn({
		cmd: [
			"osascript",
			"-e",
			`
            tell application "System Events"
                delay 0.5
                keystroke "v" using {command down}
            end tell
        `,
		],
		stdout: "pipe",
		stderr: "pipe",
	});
	const exitCode = await proc.exited;
	const error = await new Response(proc.stderr).text();
	if (error) console.error("Error:", error);
	return exitCode;
}

async function executeScript() {
	const proc = spawn({
		cmd: [
			"osascript",
			"-e",
			`
            tell application "System Events"
                keystroke return
            end tell
        `,
		],
		stdout: "pipe",
		stderr: "pipe",
	});
	const exitCode = await proc.exited;
	const error = await new Response(proc.stderr).text();
	if (error) console.error("Error:", error);
	return exitCode;
}

async function run() {
	const testFile = path.join(process.cwd(), "test", filename);
	const dist = await Bun.build({
		entrypoints: [testFile],
		target: "browser",
		minify: true,
	});
	const script = await dist.outputs[0].text();
	await clipboard.write(script);
	await openDevTools();
	await pasteFromClipboard();
	await executeScript();
}

run();
