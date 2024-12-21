import { createNewApp } from "../lib/bootstrap";
const name = process.argv[2];
if (name) {
    createNewApp(name);
} else {
    console.log("No app name provided");
}
