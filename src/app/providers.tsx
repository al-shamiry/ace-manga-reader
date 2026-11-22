import { JSX } from "solid-js";

import { LibraryProvider } from "~/context/LibraryContext";
import { ReaderChromeProvider } from "~/context/ReaderChromeContext";
import { SourcesProvider } from "~/context/SourcesContext";
import { ViewLoadingProvider } from "~/context/ViewLoadingContext";

export type ProvidersProps = {
  children: JSX.Element;
};

/** Global context stack wrapped around the entire app shell. */
export function Providers(props: ProvidersProps) {
  return (
    <SourcesProvider>
      <LibraryProvider>
        <ViewLoadingProvider>
          <ReaderChromeProvider>{props.children}</ReaderChromeProvider>
        </ViewLoadingProvider>
      </LibraryProvider>
    </SourcesProvider>
  );
}
