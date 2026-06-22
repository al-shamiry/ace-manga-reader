import { Route } from "@solidjs/router";

import { HistoryView } from "~/views/HistoryView";
import { LibraryView } from "~/views/LibraryView";
import { MangaDetailView } from "~/views/MangaDetailView";
import { ReaderView } from "~/views/ReaderView";
import { SettingsView } from "~/views/SettingsView";
import { SourcesView } from "~/views/SourcesView";
import { SourceView } from "~/views/SourceView";

/** Route table mounted under the App shell. */
export function Routes() {
  return (
    <>
      <Route path="/" component={LibraryView} />
      <Route path="/source/:id" component={SourceView} />
      <Route path="/manga/:id" component={MangaDetailView} />
      <Route path="/reader/:id" component={ReaderView} />
      <Route path="/history" component={HistoryView} />
      <Route path="/sources" component={SourcesView} />
      <Route path="/settings" component={SettingsView} />
    </>
  );
}
