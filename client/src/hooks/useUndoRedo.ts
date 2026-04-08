import { useState, useCallback } from "react";

/**
 * Custom hook for undo/redo functionality
 * Maintains a history stack of state snapshots
 */

export interface UndoRedoState<T> {
  present: T;
  past: T[];
  future: T[];
}

export function useUndoRedo<T>(initialState: T) {
  const [state, setState] = useState<UndoRedoState<T>>({
    present: initialState,
    past: [],
    future: [],
  });

  const setPresent = useCallback((newPresent: T | ((prev: T) => T)) => {
    setState((prevState) => {
      const nextPresent = typeof newPresent === "function"
        ? (newPresent as (prev: T) => T)(prevState.present)
        : newPresent;

      // Don't add to history if state hasn't changed
      if (JSON.stringify(nextPresent) === JSON.stringify(prevState.present)) {
        return prevState;
      }

      return {
        present: nextPresent,
        past: [...prevState.past, prevState.present],
        future: [], // clear future when new change is made
      };
    });
  }, []);

  const undo = useCallback(() => {
    setState((prevState) => {
      if (prevState.past.length === 0) return prevState;

      const newPast = prevState.past.slice(0, -1);
      const newPresent = prevState.past[prevState.past.length - 1];

      return {
        present: newPresent,
        past: newPast,
        future: [prevState.present, ...prevState.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((prevState) => {
      if (prevState.future.length === 0) return prevState;

      const newFuture = prevState.future.slice(1);
      const newPresent = prevState.future[0];

      return {
        present: newPresent,
        past: [...prevState.past, prevState.present],
        future: newFuture,
      };
    });
  }, []);

  const reset = useCallback((newState: T) => {
    setState({
      present: newState,
      past: [],
      future: [],
    });
  }, []);

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  return {
    state: state.present,
    setState: setPresent,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  };
}
