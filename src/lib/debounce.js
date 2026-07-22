import { useRef, useCallback } from "react";

// Replica EasyDebounce.debounce(..., Duration(milliseconds: 2000), ...) de
// row_articles_widget.dart. Tiempo exacto: 2000 ms (verificado en código Dart).
export function useDebouncedCallback(callback, delay = 2000) {
  const timer = useRef(null);
  return useCallback(
    (...args) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay]
  );
}
