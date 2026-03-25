/* @refresh reload */
import { render } from "solid-js/web";
import { Router, Route } from "@solidjs/router";
import App from "./App";
import { RootView } from "./views/RootView";
import { SourceView } from "./views/SourceView";
import { MangaDetailView } from "./views/MangaDetailView";
import { ReaderView } from "./views/ReaderView";
import { HistoryView } from "./views/HistoryView";
import { SourcesView } from "./views/SourcesView";
import { SettingsView } from "./views/SettingsView";

render(
  () => (
    <Router root={App}>
      <Route path="/" component={RootView} />
      <Route path="/source/:id" component={SourceView} />
      <Route path="/manga/:id" component={MangaDetailView} />
      <Route path="/reader/:id" component={ReaderView} />
      <Route path="/history" component={HistoryView} />
      <Route path="/sources" component={SourcesView} />
      <Route path="/settings" component={SettingsView} />
    </Router>
  ),
  document.getElementById("root") as HTMLElement
);
