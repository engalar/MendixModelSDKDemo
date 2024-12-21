import { createNewApp } from "../lib/bootstrap";
const name = process.argv[2];
if (name) {
    createNewApp("_ModelSdk1");
} else {
    console.log("No app name provided");
}
