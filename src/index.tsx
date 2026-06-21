/* @refresh reload */
import { render } from "solid-js/web";
import { Route, Router } from "@solidjs/router";

import App from "./App";
import { HistoryView } from "./views/HistoryView";
import { LibraryView } from "./views/LibraryView";
import { MangaDetailView } from "./views/MangaDetailView";
import { ReaderView } from "./views/ReaderView";
import { SettingsView } from "./views/SettingsView";
import { SourcesView } from "./views/SourcesView";
import { SourceView } from "./views/SourceView";

// Clear the inline loader from index.html before Solid mounts — render()
// appends to the target, it does not replace its children.
const root = document.getElementById("root") as HTMLElement;
root.replaceChildren();

render(
  () => (
    <Router root={App}>
      <Route path="/" component={LibraryView} />
      <Route path="/source/:id" component={SourceView} />
      <Route path="/manga/:id" component={MangaDetailView} />
      <Route path="/reader/:id" component={ReaderView} />
      <Route path="/history" component={HistoryView} />
      <Route path="/sources" component={SourcesView} />
      <Route path="/settings" component={SettingsView} />
    </Router>
  ),
  root,
);
