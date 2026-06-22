/* @refresh reload */
import { render } from "solid-js/web";
import { Router } from "@solidjs/router";

import App from "~/app/App";
import { Routes } from "~/app/routes";

// Clear the inline loader from index.html before Solid mounts — render()
// appends to the target, it does not replace its children.
const root = document.getElementById("root") as HTMLElement;
root.replaceChildren();

render(
  () => (
    <Router root={App}>
      <Routes />
    </Router>
  ),
  root,
);
