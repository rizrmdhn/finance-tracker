import * as React from "react";

type ReactRef<T> =
  | React.RefCallback<T>
  | React.RefObject<T>
  | null
  | undefined;

function setRef<T>(ref: ReactRef<T>, value: T) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref !== null && ref !== undefined) {
    (ref as React.RefObject<T>).current = value;
  }
}

function composeRefs<T>(...refs: ReactRef<T>[]): React.RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      setRef(ref, node);
    }
  };
}

function useComposedRefs<T>(...refs: ReactRef<T>[]): React.RefCallback<T> {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useCallback(composeRefs(...refs), refs);
}

export { composeRefs, useComposedRefs };
