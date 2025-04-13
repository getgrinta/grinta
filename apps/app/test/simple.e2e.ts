import { fireEvent, screen } from "@testing-library/dom";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
	const searchBar = screen.getByTestId("searchBar");
	fireEvent.input(searchBar, { target: { value: "calculator" } });
	await sleep(1000);
	const commandListItems = screen.getAllByTestId("command-list-item.0");
	fireEvent.click(commandListItems[0]);
	console.info("TEST_COMPLETE_SUCCESS");
}

run();
