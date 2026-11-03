const activeOperations = new Set<symbol>();
const listeners = new Set<() => void>();

export function beginGlobalLoading() {
  const operation = Symbol();
  activeOperations.add(operation);
  listeners.forEach((listener) => listener());
  return () => {
    if (activeOperations.delete(operation)) listeners.forEach((listener) => listener());
  };
}

export function subscribeGlobalLoading(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isGlobalLoading() {
  return activeOperations.size > 0;
}
